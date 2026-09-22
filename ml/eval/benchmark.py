"""Real-video rep benchmark: human vs previous engine vs current engine.

    # 1. check the annotations before spending time on extraction
    python -m ml.eval.benchmark validate --annotations ml/eval/benchmark/annotations.jsonl

    # 2. run (landmarks are extracted once per clip and cached locally)
    python -m ml.eval.benchmark run --annotations ml/eval/benchmark/annotations.jsonl

    # an empty annotation line to copy
    python -m ml.eval.benchmark template

Everything stays on this machine: videos are read from a local folder, the
MediaPipe landmarks are cached next to them, and the report is written as JSON
+ Markdown. Nothing is uploaded, and ml/eval/benchmark/{videos,cache}/ are
git-ignored.

Both engines are the real browser code, replayed over the same landmarks by
ml/eval/rule_engine_driver.cjs:
    before  ml/eval/baseline/pose-rules-v1.js  (engine prior to commit eca45d6)
    after   js/pose-rules.js                   (what production runs)

Nothing here invents a number. A clip without a human count is rejected, not
defaulted; precision/recall are only computed when the annotator supplied rep
timestamps; and with no annotated clips the report says "Not measured".
See ml/eval/benchmark/README.md for the annotation format.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
BENCH = HERE / "benchmark"
DRIVER = HERE / "rule_engine_driver.cjs"
EXTRACTOR_VERSION = "mediapipe-pose-c1-v1"   # bump if extraction settings change → cache invalidates

PILOTS = ("squat", "pushup", "lunge")
REQUIRED = ("clip_id", "subject_id", "exercise", "human_rep_count", "camera_view", "lighting", "speed")
CONDITIONS = ("normal", "fast", "slow", "shallow", "pause", "off_angle", "frame_edge", "low_light", "occlusion")
VIEWS = ("side", "45", "front", "back", "other")
LIGHTING = ("normal", "low", "bright")
SPEEDS = ("normal", "fast", "slow", "mixed")
DEVICES = ("iphone", "android", "webcam", "other", "unknown")
MATCH_TOLERANCE_S = 0.75
FAST_REP_S = 0.6        # reported, not enforced: see the fast-reps note in benchmark/README.md
USABLE_SKELETON = 0.5   # share of frames with a detected person for a clip to count as evidence


# ---------------------------------------------------------------- annotations
def load_annotations(path: str | Path) -> list[dict]:
    p = Path(path)
    if not p.exists():
        return []
    text = p.read_text(encoding="utf-8").strip()
    if not text:
        return []
    if text.startswith("["):
        return json.loads(text)
    return [json.loads(line) for line in text.splitlines() if line.strip() and not line.lstrip().startswith("//")]


def clip_conditions(clip: dict) -> list[str]:
    raw = clip.get("conditions", clip.get("condition", []))
    if isinstance(raw, str):
        raw = [raw]
    return [str(c).lower() for c in raw]


def video_path(clip: dict, videos_dir: Path) -> Path:
    if clip.get("video"):
        v = Path(clip["video"])
        return v if v.is_absolute() else (Path.cwd() / v)
    matches = sorted(videos_dir.glob(f"{clip['clip_id']}.*"))
    return matches[0] if matches else videos_dir / f"{clip['clip_id']}.mp4"


def validate(clips: list[dict], videos_dir: Path, need_video: bool = True) -> list[str]:
    """Every problem, not just the first. A missing value is an error — never a default."""
    errors, seen = [], set()
    for i, clip in enumerate(clips):
        where = f"clip #{i + 1} ({clip.get('clip_id', '?')})"
        for field in REQUIRED:
            if clip.get(field) in (None, ""):
                errors.append(f"{where}: '{field}' is missing")
        if clip.get("clip_id") in seen:
            errors.append(f"{where}: duplicate clip_id")
        seen.add(clip.get("clip_id"))
        if clip.get("exercise") not in (None, "") and clip["exercise"] not in PILOTS:
            errors.append(f"{where}: exercise must be one of {PILOTS}")
        count = clip.get("human_rep_count")
        if count is not None and (not isinstance(count, int) or isinstance(count, bool) or count < 0):
            errors.append(f"{where}: human_rep_count must be a whole number >= 0")
        for field, allowed in (("camera_view", VIEWS), ("lighting", LIGHTING), ("speed", SPEEDS)):
            if clip.get(field) not in (None, "") and str(clip[field]).lower() not in allowed:
                errors.append(f"{where}: {field} must be one of {allowed}")
        bad = [c for c in clip_conditions(clip) if c not in CONDITIONS]
        if bad:
            errors.append(f"{where}: unknown condition(s) {bad}; allowed {CONDITIONS}")
        device = clip.get("device_class")
        if device not in (None, "") and str(device).lower() not in DEVICES:
            errors.append(f"{where}: device_class must be one of {DEVICES}")
        stamps = clip.get("rep_timestamps")
        if stamps is not None:
            if not isinstance(stamps, list) or not all(isinstance(t, (int, float)) and t >= 0 for t in stamps):
                errors.append(f"{where}: rep_timestamps must be a list of seconds")
            elif stamps != sorted(stamps):
                errors.append(f"{where}: rep_timestamps must be in order")
            elif isinstance(count, int) and len(stamps) != count:
                errors.append(f"{where}: {len(stamps)} rep_timestamps but human_rep_count is {count}")
        if need_video and clip.get("clip_id") and not video_path(clip, videos_dir).exists():
            errors.append(f"{where}: video not found at {video_path(clip, videos_dir)}")
    return errors


# ---------------------------------------------------------------- extraction
def _signature(path: Path) -> str:
    st = path.stat()
    return hashlib.sha256(f"{path.name}|{st.st_size}|{int(st.st_mtime)}|{EXTRACTOR_VERSION}".encode()).hexdigest()[:16]


def extract_cached(clip: dict, video: Path, cache_dir: Path, use_cache: bool = True):
    """(frames, fps, aspect, detected_ratio). Landmarks are extracted once per video."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache = cache_dir / f"{clip['clip_id']}.npz"
    sig = _signature(video)
    if use_cache and cache.exists():
        with np.load(cache, allow_pickle=False) as z:
            if str(z["signature"]) == sig:
                return _frames_from_arrays(z["landmarks"], z["detected"]), float(z["fps"]), float(z["aspect"]), \
                    float(np.mean(z["detected"])) if len(z["detected"]) else 0.0
    from ..preprocessing.mp_pose import video_landmarks  # needs mediapipe + opencv
    frames, fps, aspect = video_landmarks(video)
    arr = np.zeros((len(frames), 33, 4), np.float32)
    detected = np.zeros(len(frames), bool)
    for i, lm in enumerate(frames):
        if lm:
            detected[i] = True
            arr[i] = [[p["x"], p["y"], p["z"], p["visibility"]] for p in lm]
    np.savez_compressed(cache, landmarks=arr, detected=detected, fps=np.float32(fps),
                        aspect=np.float32(aspect), signature=np.array(sig))
    return frames, fps, aspect, float(np.mean(detected)) if len(detected) else 0.0


def _frames_from_arrays(landmarks: np.ndarray, detected: np.ndarray):
    return [None if not detected[i] else
            [{"x": float(p[0]), "y": float(p[1]), "z": float(p[2]), "visibility": float(p[3])} for p in lm]
            for i, lm in enumerate(landmarks)]


def replay(exercise: str, frames, fps: float, aspect: float, engine: str, trace: bool = False) -> dict:
    """Feed the engine exactly the frames the app would see (~12.5 fps, js/pose.js),
    then translate its rep frame indices back to seconds in the source video."""
    from ..preprocessing.mp_pose import app_rate_indices
    keep = app_rate_indices(len(frames), fps)
    payload = {"exercise": exercise, "aspect": aspect, "engine": engine, "predictions": [], "trace": trace,
               "frames": [{"lm": frames[i], "ts": i * 1000.0 / fps} for i in keep]}
    proc = subprocess.run([shutil.which("node") or "node", str(DRIVER)], input=json.dumps(payload),
                          capture_output=True, text=True, timeout=1800)
    if proc.returncode != 0:
        raise RuntimeError(f"rule engine driver failed: {(proc.stderr or proc.stdout)[:400]}")
    out = json.loads(proc.stdout)
    out["rules"]["rep_seconds"] = [round(keep[f] / fps, 3) for f in out["rules"]["frames"]]
    out["sampled_frames"] = len(keep)
    return out


# ---------------------------------------------------------------- metrics
def match(counted_s, truth_s, tolerance: float = MATCH_TOLERANCE_S):
    """Greedy nearest match of counted rep times to annotated ones → (tp, fp, fn)."""
    remaining = list(truth_s)
    tp = 0
    for t in counted_s:
        near = [h for h in remaining if abs(h - t) <= tolerance]
        if near:
            remaining.remove(min(near, key=lambda h: abs(h - t)))
            tp += 1
    return tp, len(counted_s) - tp, len(remaining)


def prf(tp: int, fp: int, fn: int) -> dict:
    p = tp / (tp + fp) if tp + fp else None
    r = tp / (tp + fn) if tp + fn else None
    f1 = 2 * p * r / (p + r) if p and r else (0.0 if p is not None and r is not None else None)
    return {"tp": tp, "fp": fp, "fn": fn, "precision": _r(p), "recall": _r(r), "f1": _r(f1)}


def _r(x, n=3):
    return None if x is None else round(float(x), n)


def clip_row(clip: dict, before: dict, after: dict, fps: float, detected_ratio: float, n_frames: int) -> dict:
    human = int(clip["human_rep_count"])
    row = {
        "clip_id": clip["clip_id"], "subject_id": clip["subject_id"], "exercise": clip["exercise"],
        "conditions": clip_conditions(clip) or ["unspecified"],
        "camera_view": str(clip["camera_view"]).lower(), "lighting": str(clip["lighting"]).lower(),
        "speed": str(clip["speed"]).lower(), "device_class": str(clip.get("device_class") or "unknown").lower(),
        "notes": clip.get("notes", ""), "frames": n_frames, "duration_s": round(n_frames / fps, 2) if fps else None,
        "skeleton_detected": round(detected_ratio, 3),
        "human": human, "before": before["rules"]["reps"], "after": after["rules"]["reps"],
    }
    for name in ("before", "after"):
        counted = row[name]
        row[f"{name}_signed_error"] = counted - human
        row[f"{name}_abs_error"] = abs(counted - human)
        row[f"{name}_missed"] = max(0, human - counted)          # count-based
        row[f"{name}_false_positive"] = max(0, counted - human)  # count-based
    stamps = clip.get("rep_timestamps")
    if stamps is not None:
        for name, res in (("before", before), ("after", after)):
            counted_s = res["rules"]["rep_seconds"]
            row[f"{name}_matched"] = prf(*match(counted_s, stamps))
        gaps = np.diff(stamps).tolist() if len(stamps) > 1 else []
        row["human_rep_intervals_s"] = [round(g, 2) for g in gaps]
        row["human_fast_reps"] = sum(1 for g in gaps if g < FAST_REP_S)
    row["after_reasons"] = after["rules"].get("reasons", {})
    row["after_events"] = after["rules"].get("events", {})
    row["after_form_score"] = after["rules"].get("formScore")
    row["form_label"] = clip.get("form_label")  # reported beside, never scored without a validated mapping
    rule = after.get("rule") or {}
    row["recommended_view"] = rule.get("view")
    total = max(1, after.get("sampled_frames") or n_frames)
    reasons = row["after_reasons"]
    row["refused_view_share"] = round(reasons.get("camera_view_unsuitable", 0) / total, 3)
    row["out_of_frame_share"] = round(reasons.get("body_out_of_frame", 0) / total, 3)
    row["verdict"] = ("better" if row["after_abs_error"] < row["before_abs_error"] else
                      "worse" if row["after_abs_error"] > row["before_abs_error"] else "equal")
    return row


def aggregate(rows: list[dict]) -> dict:
    if not rows:
        return {"clips": 0}
    out = {"clips": len(rows), "subjects": len({r["subject_id"] for r in rows}), "human_reps": sum(r["human"] for r in rows),
           # a clip in which MediaPipe rarely found a person measures nothing about counting
           "usable_clips": sum(1 for r in rows if r.get("skeleton_detected", 0) >= USABLE_SKELETON)}
    for name in ("before", "after"):
        out[name] = {
            "counted": sum(r[name] for r in rows),
            "mae": _r(np.mean([r[f"{name}_abs_error"] for r in rows])),
            "mean_signed_error": _r(np.mean([r[f"{name}_signed_error"] for r in rows])),
            "missed": sum(r[f"{name}_missed"] for r in rows),
            "false_positive": sum(r[f"{name}_false_positive"] for r in rows),
            "exact_clips": sum(1 for r in rows if r[f"{name}_abs_error"] == 0),
        }
        timed = [r[f"{name}_matched"] for r in rows if f"{name}_matched" in r]
        out[name]["matched"] = prf(sum(m["tp"] for m in timed), sum(m["fp"] for m in timed),
                                   sum(m["fn"] for m in timed)) if timed else None
        out[name]["timed_clips"] = len(timed)
    return out


def group(rows: list[dict], key) -> dict:
    buckets = defaultdict(list)
    for r in rows:
        keys = key(r)
        for k in (keys if isinstance(keys, list) else [keys]):
            buckets[k].append(r)
    return {k: aggregate(v) for k, v in sorted(buckets.items())}


def regression(rows: list[dict]) -> dict:
    return {
        "better": [r["clip_id"] for r in rows if r["verdict"] == "better"],
        "worse": [r["clip_id"] for r in rows if r["verdict"] == "worse"],
        "equal": [r["clip_id"] for r in rows if r["verdict"] == "equal"],
        "after_overcounts": [r["clip_id"] for r in rows if r["after_signed_error"] > 0],
        "after_undercounts": [r["clip_id"] for r in rows if r["after_signed_error"] < 0],
        "worst_after": [r["clip_id"] for r in sorted(rows, key=lambda r: (-r["after_abs_error"], -(r["after_abs_error"] - r["before_abs_error"])))
                        if r["after_abs_error"] > 0][:10],
    }


def camera_guidance(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        rec = r["recommended_view"]
        mismatch = rec in ("side", "front") and r["camera_view"] not in (rec, "45")
        out.append({"clip_id": r["clip_id"], "exercise": r["exercise"], "recommended": rec,
                    "actual": r["camera_view"], "mismatch": mismatch,
                    "refused_view_share": r["refused_view_share"], "out_of_frame_share": r["out_of_frame_share"],
                    "after": r["after"], "human": r["human"],
                    # the worst outcome: wrong angle, not refused, and counted something wrong
                    "silently_miscounted": mismatch and r["refused_view_share"] < 0.5 and r["after_abs_error"] > 0})
    return out


# ---------------------------------------------------------------- report
def markdown(report: dict) -> str:
    L = []
    s = report["summary"]
    L.append(f"# Rep benchmark — {report['generated_at']}\n")
    measured = s.get("usable_clips", 0) > 0
    L.append(f"REAL VIDEO: {'Measured' if measured else 'Not measured'}  ")
    L.append(f"Clips {s['clips']} (usable: {s.get('usable_clips', 0)} with a person detected in "
             f">= {int(USABLE_SKELETON*100)}% of frames) · subjects {s.get('subjects', 0)} · human reps {s.get('human_reps', 0)}  ")
    if measured and s.get("subjects", 0) < 3:
        L.append("Fewer than 3 subjects: these numbers describe these recordings, not users in general.  ")
    L.append(f"Before = `{report['engines']['before']}` · After = `{report['engines']['after']}`\n")
    if not s["clips"]:
        L.append("No annotated clips — nothing was measured.")
        return "\n".join(L)
    L.append("## Count accuracy (all clips)\n")
    L.append("| engine | counted | MAE | mean signed error | missed | false positive | exact clips |")
    L.append("|---|---|---|---|---|---|---|")
    for e in ("before", "after"):
        a = s[e]
        L.append(f"| {e} | {a['counted']} | {a['mae']} | {a['mean_signed_error']} | {a['missed']} | {a['false_positive']} | {a['exact_clips']}/{s['clips']} |")
    for e in ("before", "after"):
        m = s[e]["matched"]
        L.append(f"\nTimestamp-matched {e}: " + (f"P {m['precision']} R {m['recall']} F1 {m['f1']} over {s[e]['timed_clips']} clips"
                                               if m else "no rep timestamps annotated"))
    for title, key in (("Per exercise", "per_exercise"), ("Per condition", "per_condition"), ("Per device", "per_device")):
        L.append(f"\n## {title}\n")
        L.append("| group | clips | human | before (MAE) | after (MAE) | after missed | after FP |")
        L.append("|---|---|---|---|---|---|---|")
        for g, a in report[key].items():
            L.append(f"| {g} | {a['clips']} | {a['human_reps']} | {a['before']['counted']} ({a['before']['mae']}) | "
                     f"{a['after']['counted']} ({a['after']['mae']}) | {a['after']['missed']} | {a['after']['false_positive']} |")
    L.append("\n## Per clip\n")
    L.append("| clip | exercise | conditions | view | human | before | after | verdict |")
    L.append("|---|---|---|---|---|---|---|---|")
    for r in report["clips"]:
        L.append(f"| {r['clip_id']} | {r['exercise']} | {', '.join(r['conditions'])} | {r['camera_view']} | "
                 f"{r['human']} | {r['before']} | {r['after']} | {r['verdict']} |")
    reg = report["regression"]
    L.append("\n## Regression check\n")
    for k in ("better", "worse", "equal", "after_overcounts", "after_undercounts", "worst_after"):
        L.append(f"- **{k}** ({len(reg[k])}): {', '.join(reg[k]) or '—'}")
    fast = report["fast_reps"]
    L.append("\n## Reps faster than 0.6 s\n")
    L.append(fast["note"])
    cg = [c for c in report["camera_guidance"] if c["mismatch"]]
    L.append("\n## Camera guidance\n")
    L.append(f"{len(cg)} clip(s) filmed away from the recommended view; "
             f"{sum(1 for c in cg if c['silently_miscounted'])} miscounted without the app refusing.")
    L.append("\n## Form (reported separately from counting)\n")
    L.append("Form accuracy is not scored: it needs form labels and a validated mapping from engine "
             "warnings to those labels. Per-clip engine form scores are in the JSON report.")
    if report["failures"]:
        L.append("\n## Failed clips — engine trace (after)\n")
        for f in report["failures"]:
            L.append(f"### {f['clip_id']} — human {f['human']}, after {f['after']}")
            L.append(f"reasons: `{json.dumps(f['reasons'])}`  ")
            L.append("```")
            for t in f["trace"][:40]:
                L.append(f"{t['t']:>6}s {str(t['phase']):11s} {str(t['reason']):24s} metric {t['metric']} range {t['range']} "
                         f"dir {t['dir']} depth {t['depthOk']} calib {t['calibrated']} vis {t['vis']} {t['event'] or ''}")
            L.append("```")
    return "\n".join(L)


def run(args) -> int:
    clips = load_annotations(args.annotations)
    videos_dir, cache_dir, out_dir = Path(args.videos_dir), Path(args.cache_dir), Path(args.out_dir)
    if not clips:
        print(f"No annotated clips in {args.annotations}.")
        print("REAL VIDEO: Not measured — record clips, annotate them (python -m ml.eval.benchmark template), then run again.")
        return 2
    errors = validate(clips, videos_dir, need_video=True)
    if errors:
        print("Annotation problems (fix these; nothing is guessed):")
        for e in errors:
            print(f"  - {e}")
        return 1

    rows, failures = [], []
    for clip in clips:
        video = video_path(clip, videos_dir)
        frames, fps, aspect, detected = extract_cached(clip, video, cache_dir, use_cache=not args.no_cache)
        before = replay(clip["exercise"], frames, fps, aspect, "baseline")
        after = replay(clip["exercise"], frames, fps, aspect, "current", trace=True)
        row = clip_row(clip, before, after, fps, detected, len(frames))
        rows.append(row)
        print(f"{row['clip_id'][:34]:34s} {row['exercise']:7s} human {row['human']:3d}  before {row['before']:3d}  "
              f"after {row['after']:3d}  {row['verdict']:6s} skeleton {row['skeleton_detected']:.0%}")
        if row["after_abs_error"] > 0:
            failures.append({"clip_id": row["clip_id"], "human": row["human"], "after": row["after"],
                             "reasons": row["after_reasons"], "trace": after["rules"].get("trace") or []})

    intervals = [g for r in rows for g in r.get("human_rep_intervals_s", [])]
    fast_note = ("No rep timestamps annotated, so real rep speed is unknown. Annotate `rep_timestamps` "
                 "before deciding anything about sub-0.6 s reps." if not intervals else
                 f"{sum(1 for g in intervals if g < FAST_REP_S)} of {len(intervals)} annotated rep intervals "
                 f"were under {FAST_REP_S} s (min {min(intervals):.2f} s, median {float(np.median(intervals)):.2f} s).")
    report = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "engines": {"before": "ml/eval/baseline/pose-rules-v1.js", "after": "js/pose-rules.js"},
        "summary": aggregate(rows),
        "per_exercise": group(rows, lambda r: r["exercise"]),
        "per_condition": group(rows, lambda r: r["conditions"]),
        "per_device": group(rows, lambda r: r["device_class"]),
        "per_view": group(rows, lambda r: r["camera_view"]),
        "regression": regression(rows),
        "camera_guidance": camera_guidance(rows),
        "fast_reps": {"threshold_s": FAST_REP_S, "intervals": len(intervals),
                      "below": sum(1 for g in intervals if g < FAST_REP_S), "note": fast_note},
        "clips": rows,
        "failures": failures,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    (out_dir / f"report-{stamp}.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (out_dir / f"report-{stamp}.md").write_text(markdown(report), encoding="utf-8")
    s = report["summary"]
    print(f"\nMAE before {s['before']['mae']}  after {s['after']['mae']}   "
          f"(mean signed error before {s['before']['mean_signed_error']}, after {s['after']['mean_signed_error']})")
    print(f"clips better {len(report['regression']['better'])}, worse {len(report['regression']['worse'])}, "
          f"equal {len(report['regression']['equal'])}")
    print(f"wrote {out_dir / f'report-{stamp}.md'}")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Real-video rep benchmark (human vs before vs after)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("validate", "run"):
        p = sub.add_parser(name)
        p.add_argument("--annotations", default=str(BENCH / "annotations.jsonl"))
        p.add_argument("--videos-dir", default=str(BENCH / "videos"))
        if name == "run":
            p.add_argument("--cache-dir", default=str(BENCH / "cache"))
            p.add_argument("--out-dir", default=str(BENCH / "reports"))
            p.add_argument("--no-cache", action="store_true")
    sub.add_parser("template")
    args = ap.parse_args(argv)

    if args.cmd == "template":
        print(json.dumps({"clip_id": None, "subject_id": None, "exercise": None, "human_rep_count": None,
                          "rep_timestamps": None, "camera_view": None, "lighting": None, "speed": None,
                          "conditions": [], "device_class": None, "form_label": None, "notes": ""}))
        return 0
    if args.cmd == "validate":
        clips = load_annotations(args.annotations)
        if not clips:
            print(f"No annotated clips in {args.annotations}. REAL VIDEO: Not measured.")
            return 2
        errors = validate(clips, Path(args.videos_dir), need_video=True)
        for e in errors:
            print(f"  - {e}")
        print(f"{len(clips)} clip(s): {'OK' if not errors else f'{len(errors)} problem(s)'}")
        return 1 if errors else 0
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
