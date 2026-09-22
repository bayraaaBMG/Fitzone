"""STEP 15: count reps in REAL recorded clips, with the old and new engines.

    # one clip
    python -m ml.eval.video_reps --exercise squat --video clips/s01_normal.mp4 --human-reps 20

    # a set of clips, including the edge cases from STEP 16
    python -m ml.eval.video_reps --exercise squat --clips clips/squat.json --out squat_reps.json

    clips.json:
      [{"video": "clips/s01_normal.mp4",  "human_reps": 20, "note": "normal"},
       {"video": "clips/s01_lowlight.mp4","human_reps": 15, "note": "low light"}]

Prints Human / Before / After per clip plus absolute count error, and saves a
JSON report. `human_reps` is what a person counted while watching the clip —
this tool never invents it, and refuses to run without it.

Both engines are the real browser code (js/pose-rules.js and the pre-fix
snapshot in ml/eval/baseline/), replayed through ml/eval/rule_engine_driver.cjs
over landmarks extracted here with the same MediaPipe model family the app uses.

Requires mediapipe + opencv locally (see ml/requirements.txt); nothing is
uploaded anywhere and the video never leaves the machine.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np

from ..training.config import MISTAKES, TrainConfig

DRIVER = Path(__file__).with_name("rule_engine_driver.cjs")


def landmarks_from_video(video: str | Path):
    """(frames, fps, aspect) via the same model + API the browser uses."""
    try:
        from ..preprocessing.mp_pose import video_landmarks
        return video_landmarks(video)
    except ImportError as exc:  # pragma: no cover - depends on the local machine
        raise SystemExit(f"mediapipe/opencv are needed to read video ({exc}). "
                         "pip install mediapipe opencv-python") from exc


def count_reps(exercise: str, frames, fps: float, aspect: float, engine: str, sequence_length: int):
    from ..preprocessing.mp_pose import app_rate_indices
    keep = app_rate_indices(len(frames), fps)   # the frames the app's pose loop would process
    payload = {"exercise": exercise, "aspect": aspect, "engine": engine, "predictions": [],
               "sequenceLength": sequence_length,
               "frames": [{"lm": frames[i], "ts": i * 1000.0 / fps} for i in keep]}
    proc = subprocess.run([shutil.which("node") or "node", str(DRIVER)],
                          input=json.dumps(payload), capture_output=True, text=True, timeout=1800)
    if proc.returncode != 0:
        raise SystemExit(f"rule engine driver failed: {(proc.stderr or proc.stdout)[:400]}")
    result = json.loads(proc.stdout)["rules"]
    return result["reps"], result


def load_clips(args) -> list[dict]:
    if args.clips:
        clips = json.loads(Path(args.clips).read_text(encoding="utf-8"))
    elif args.video:
        clips = [{"video": args.video, "human_reps": args.human_reps, "note": args.note or ""}]
    else:
        raise SystemExit("pass --clips clips.json or --video FILE --human-reps N")
    for clip in clips:
        if clip.get("human_reps") is None:
            raise SystemExit(f"{clip.get('video')}: human_reps is missing. Watch the clip and count; "
                             "this tool will not guess.")
    return clips


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Rep counts on real recordings: human vs before vs after")
    ap.add_argument("--exercise", required=True, choices=sorted(MISTAKES))
    ap.add_argument("--clips", default=None, help="JSON list of {video, human_reps, note}")
    ap.add_argument("--video", default=None)
    ap.add_argument("--human-reps", type=int, default=None, dest="human_reps")
    ap.add_argument("--note", default=None)
    ap.add_argument("--engines", nargs="*", default=["baseline", "current"])
    ap.add_argument("--out", default=None)
    args = ap.parse_args(argv)

    cfg = TrainConfig.for_exercise(args.exercise)
    clips = load_clips(args)
    rows = []
    for clip in clips:
        frames, fps, aspect = landmarks_from_video(clip["video"])
        detected = sum(1 for f in frames if f)
        row = {"video": Path(clip["video"]).name, "note": clip.get("note", ""),
               "human": int(clip["human_reps"]), "frames": len(frames),
               "detected_ratio": round(detected / max(1, len(frames)), 3)}
        for engine in args.engines:
            reps, _ = count_reps(args.exercise, frames, fps, aspect, engine, cfg.sequence_length)
            row[engine] = reps
            row[f"error_{engine}"] = abs(reps - row["human"])
        rows.append(row)
        print(f"{row['video'][:34]:34s} human {row['human']:3d}  " +
              "  ".join(f"{e} {row[e]:3d}" for e in args.engines) +
              f"   skeleton {row['detected_ratio']:.0%}  {row['note']}")

    totals = {"human": sum(r["human"] for r in rows)}
    for engine in args.engines:
        totals[engine] = sum(r[engine] for r in rows)
        totals[f"abs_error_{engine}"] = sum(r[f"error_{engine}"] for r in rows)
        totals[f"missed_{engine}"] = sum(max(0, r["human"] - r[engine]) for r in rows)
        totals[f"false_{engine}"] = sum(max(0, r[engine] - r["human"]) for r in rows)
    print("\ntotals:", json.dumps(totals))
    print("Counts only. Matching individual reps (precision/recall) needs per-rep "
          "annotations — use ml.eval.rep_compare for that.")

    report = {"exercise": args.exercise, "clips": rows, "totals": totals, "engines": args.engines}
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
