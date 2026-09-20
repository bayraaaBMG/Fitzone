"""Phase 7/10: human reps vs the rule engine vs AI-assisted, on held-out clips.

    python -m ml.eval.rep_compare --exercise squat --data ml/data/processed/squat \
        [--checkpoint ml/models/squat-v1/model.pt] [--subjects p021 p022] [--out rep_report.json]

Rep counting is its own task: a model can have a fine form-classification F1 and
still make rep counting worse. This compares, per clip and per subject:

    human   reps a person annotated as complete and valid
    rules   what the shipping rule engine counts (js/pose-rules.js)
    ai      what the rule engine counts with AI V2 allowed to veto

Both counts come from the real browser code through
ml/eval/rule_engine_driver.cjs; nothing is reimplemented here. Counted reps are
matched to annotated reps within a time tolerance, so precision and recall are
real rather than a difference of totals.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np

from ..preprocessing.sequence import pad_window
from ..training.config import MISTAKES, PHASES, FORMS, REP_VALID, TrainConfig
from ..training.dataset import load_clip

DRIVER = Path(__file__).with_name("rule_engine_driver.cjs")
MATCH_TOLERANCE_S = 0.75


def human_reps(clip: dict):
    """Frame indices a person annotated as a completed, valid repetition."""
    complete = PHASES.index("complete")
    ends = np.where(clip["phase"] == complete)[0]
    valid = [int(i) for i in ends if clip["rep_valid"][i] == 1]
    return valid, [int(i) for i in ends]


def match(counted, truth, tolerance_frames: int):
    """Greedy nearest match → (true positives, false positives, misses)."""
    remaining = list(truth)
    tp = 0
    for frame in counted:
        near = [t for t in remaining if abs(t - frame) <= tolerance_frames]
        if near:
            remaining.remove(min(near, key=lambda t: abs(t - frame)))
            tp += 1
    return tp, len(counted) - tp, len(remaining)


def prf(tp: int, fp: int, fn: int) -> dict:
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"tp": tp, "false_positive": fp, "missed": fn,
            "precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4)}


def frame_predictions(model, clip: dict, length: int, exercise: str):
    """Per-frame model output in the browser's {head: {label, confidence}} shape."""
    import torch

    classes = {"phase": PHASES, "form": FORMS, "mistake": MISTAKES[exercise], "rep_valid": REP_VALID}
    features = clip["features"]
    windows = np.stack([pad_window(features[max(0, i - length + 1): i + 1], length)
                        for i in range(len(features))]).astype(np.float32)
    out = []
    with torch.no_grad():
        for start in range(0, len(windows), 128):
            logits = model(torch.from_numpy(windows[start:start + 128]))
            batch = {h: torch.softmax(v, dim=1).numpy() for h, v in logits.items()}
            for row in range(len(next(iter(batch.values())))):
                frame = {}
                for head, probs in batch.items():
                    best = int(np.argmax(probs[row]))
                    frame[head] = {"label": classes[head][best], "confidence": float(probs[row][best])}
                out.append(frame)
    return out


def run_driver(exercise: str, clip: dict, predictions, sequence_length: int):
    landmarks = clip.get("landmarks")
    if landmarks is None:
        raise SystemExit(
            "this clip has no raw landmarks; re-run ml.preprocessing.extract_poses "
            "(it stores them alongside the features so the rule engine can be replayed)")
    fps = float(clip.get("fps", 30.0))
    frames = []
    for i, lm in enumerate(landmarks):
        usable = bool(clip["valid"][i]) if "valid" in clip else True
        points = None if not usable else [
            {"x": float(p[0]), "y": float(p[1]), "z": float(p[2]), "visibility": float(p[3])} for p in lm]
        frames.append({"lm": points, "ts": i * 1000.0 / fps})
    payload = {"exercise": exercise, "aspect": float(clip.get("aspect", 1.0)), "frames": frames,
               "predictions": predictions or [], "sequenceLength": sequence_length}
    proc = subprocess.run([shutil.which("node") or "node", str(DRIVER)],
                          input=json.dumps(payload), capture_output=True, text=True, timeout=600)
    if proc.returncode != 0:
        raise SystemExit(f"rule engine driver failed: {(proc.stderr or proc.stdout)[:400]}")
    return json.loads(proc.stdout)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Compare human, rule-engine and AI-assisted rep counts")
    ap.add_argument("--exercise", required=True, choices=sorted(MISTAKES))
    ap.add_argument("--data", required=True)
    ap.add_argument("--checkpoint", default=None, help="omit to measure the rule engine only")
    ap.add_argument("--subjects", nargs="*", default=None, help="restrict to these subjects (use the test split)")
    ap.add_argument("--out", default=None)
    args = ap.parse_args(argv)

    cfg = TrainConfig.for_exercise(args.exercise)
    paths = sorted(Path(args.data).glob("*.npz"))
    if not paths:
        print(f"No processed clips in {args.data}.")
        print("Real labeled dataset is required before training and publication.")
        return 2

    model = None
    if args.checkpoint:
        from ..training.model import load_checkpoint
        model, _ = load_checkpoint(args.checkpoint)

    rows = []
    totals = {"human": 0, "attempted": 0, "rules": 0}
    if model:
        totals["ai"] = 0
    agg = {"rules": [0, 0, 0], "ai": [0, 0, 0]}
    for path in paths:
        clip = load_clip(path)
        if args.subjects and clip["subject_id"] not in args.subjects:
            continue
        valid_ends, all_ends = human_reps(clip)
        predictions = frame_predictions(model, clip, cfg.sequence_length, args.exercise) if model else None
        result = run_driver(args.exercise, clip, predictions, cfg.sequence_length)
        tolerance = max(1, int(round(MATCH_TOLERANCE_S * float(clip.get("fps", 30.0)))))

        row = {"clip": path.stem, "subject": clip["subject_id"],
               "human": len(valid_ends), "attempted": len(all_ends),
               "rules": result["rules"]["reps"]}
        r_tp, r_fp, r_fn = match(result["rules"]["frames"], valid_ends, tolerance)
        row["rules_match"] = prf(r_tp, r_fp, r_fn)
        agg["rules"] = [a + b for a, b in zip(agg["rules"], (r_tp, r_fp, r_fn))]
        if result.get("ai"):
            row["ai"] = result["ai"]["reps"]
            row["ai_vetoes"] = result["ai"]["vetoes"]
            a_tp, a_fp, a_fn = match(result["ai"]["frames"], valid_ends, tolerance)
            row["ai_match"] = prf(a_tp, a_fp, a_fn)
            agg["ai"] = [a + b for a, b in zip(agg["ai"], (a_tp, a_fp, a_fn))]
            totals["ai"] += result["ai"]["reps"]
        totals["human"] += len(valid_ends); totals["attempted"] += len(all_ends)
        totals["rules"] += result["rules"]["reps"]
        rows.append(row)

    if not rows:
        print("no clips matched the requested subjects")
        return 2

    print(f"{'clip':28s} {'subject':8s} {'human':>6s} {'rules':>6s} {'ai':>6s}")
    for row in rows:
        print(f"{row['clip'][:28]:28s} {row['subject']:8s} {row['human']:6d} {row['rules']:6d} "
              f"{row.get('ai', '-'):>6}")
    print(f"\ntotals  human {totals['human']}  rules {totals['rules']}  ai {totals.get('ai', '-')} "
          f"(attempted reps incl. invalid: {totals['attempted']})")
    summary = {"rules": prf(*agg["rules"])}
    print(f"rules   {summary['rules']}")
    if model:
        summary["ai"] = prf(*agg["ai"])
        print(f"ai      {summary['ai']}")
        worse = summary["ai"]["false_positive"] > summary["rules"]["false_positive"]
        missed = summary["ai"]["missed"] > summary["rules"]["missed"]
        print("\nAI V2 " + ("INCREASED false-positive reps — it must not be published as is"
                            if worse else "did not increase false-positive reps"))
        if missed:
            print("AI V2 vetoed reps a person counted — check the veto threshold before publishing")

    report = {"exercise": args.exercise, "subjects": sorted({r["subject"] for r in rows}),
              "tolerance_seconds": MATCH_TOLERANCE_S, "totals": totals, "summary": summary,
              "checkpoint": args.checkpoint, "per_clip": rows}
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
