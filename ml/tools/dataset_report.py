"""Dataset statistics + split sanity, before any training.

    python -m ml.tools.dataset_report --exercise squat --data ml/data/processed/squat

Prints (and optionally writes) subjects, clips, frames, usable frames,
sequences and per-class counts per head, then checks the things that quietly
ruin a result: a person appearing in two splits, a class with almost no
examples, clips whose skeleton was rarely detected, and too few subjects to
report accuracy at all.

Refuses to invent anything: with no clips it says so and exits non-zero.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

from ..training.config import MISTAKES, PHASES, FORMS, REP_VALID, TrainConfig
from ..training.dataset import HEADS, build_dataset, clip_windows, load_clip, split_subjects

MIN_SUBJECTS_FOR_METRICS = 20   # below this, accuracy is indicative at best
MIN_TEST_SUBJECTS = 3
MIN_CLASS_WINDOWS = 30          # a class with fewer windows cannot be judged
MIN_USABLE_FRAME_RATIO = 0.5

CLASSES = {"phase": PHASES, "form": FORMS, "rep_valid": REP_VALID}


def classes_for(exercise: str) -> dict:
    return {**CLASSES, "mistake": MISTAKES[exercise]}


def clip_stats(paths, exercise: str, length: int, hop: int) -> dict:
    per_clip, per_subject = [], defaultdict(lambda: {"clips": 0, "frames": 0, "windows": 0})
    counts = {head: Counter() for head in HEADS}
    for path in paths:
        clip = load_clip(path)
        frames = int(clip["features"].shape[0])
        usable = int(np.sum(clip["valid"])) if "valid" in clip else frames
        x, y = clip_windows(clip, length, hop)
        subject = clip["subject_id"]
        for label in y:
            for head, value in label.items():
                counts[head][int(value)] += 1
        per_clip.append({
            "clip": Path(path).stem, "subject": subject, "frames": frames,
            "usable_frames": usable, "usable_ratio": round(usable / max(1, frames), 3),
            "windows": int(len(x)),
        })
        agg = per_subject[subject]
        agg["clips"] += 1; agg["frames"] += frames; agg["windows"] += int(len(x))
    return {"per_clip": per_clip, "per_subject": dict(per_subject), "label_counts": counts}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Dataset statistics for one pilot exercise")
    ap.add_argument("--exercise", required=True, choices=sorted(MISTAKES))
    ap.add_argument("--data", required=True, help="directory of processed .npz clips")
    ap.add_argument("--out", default=None, help="write the report as JSON")
    args = ap.parse_args(argv)

    cfg = TrainConfig.for_exercise(args.exercise)
    paths = sorted(Path(args.data).glob("*.npz"))
    if not paths:
        print(f"No processed clips in {args.data}.")
        print("Real labeled dataset is required before training and publication (see ml/data/README.md).")
        return 2

    stats = clip_stats(paths, args.exercise, cfg.sequence_length, cfg.hop)
    classes = classes_for(args.exercise)
    subjects = sorted(stats["per_subject"])
    problems, warnings = [], []

    print(f"exercise        {args.exercise}")
    print(f"clips           {len(paths)}")
    print(f"subjects        {len(subjects)}  {subjects}")
    print(f"frames          {sum(c['frames'] for c in stats['per_clip'])}")
    print(f"windows         {sum(c['windows'] for c in stats['per_clip'])} "
          f"(length {cfg.sequence_length}, hop {cfg.hop})")

    print("\nper class (windows):")
    for head in HEADS:
        counts = stats["label_counts"][head]
        names = classes[head]
        line = "  ".join(f"{names[i]}={counts.get(i, 0)}" for i in range(len(names)))
        print(f"  {head:10s} {line}")
        for i, name in enumerate(names):
            if counts.get(i, 0) < MIN_CLASS_WINDOWS:
                warnings.append(f"{head}/{name}: only {counts.get(i, 0)} windows "
                                f"(<{MIN_CLASS_WINDOWS}) - results for this class will not mean much")

    thin = [c for c in stats["per_clip"] if c["usable_ratio"] < MIN_USABLE_FRAME_RATIO]
    for clip in thin:
        warnings.append(f"{clip['clip']}: skeleton found in only {clip['usable_ratio']:.0%} of frames "
                        "- check framing, lighting and that one person is in view")

    # the split the trainer will actually use
    split = {"train": [], "val": [], "test": []}
    if len(subjects) >= 3:
        split = split_subjects(subjects, cfg.val_subjects, cfg.test_subjects, cfg.seed)
        print(f"\nsplit (by subject, seed {cfg.seed}):")
        for name in ("train", "val", "test"):
            print(f"  {name:5s} {len(split[name])}  {split[name]}")
        overlap = (set(split["train"]) & set(split["test"])) | (set(split["train"]) & set(split["val"])) \
            | (set(split["val"]) & set(split["test"]))
        if overlap:
            problems.append(f"LEAKAGE: subjects in more than one split: {sorted(overlap)}")
        if len(split["test"]) < MIN_TEST_SUBJECTS:
            warnings.append(f"only {len(split['test'])} test subject(s); {MIN_TEST_SUBJECTS}+ needed "
                            "before a number is worth quoting")
        data = build_dataset(args.data, cfg.sequence_length, cfg.hop, cfg.val_subjects,
                             cfg.test_subjects, cfg.seed, flip_augment=False)
        for name, part in data.items():
            print(f"  {name:5s} windows {len(part['x'])}")
            if not len(part["x"]):
                problems.append(f"{name} split has no windows")
    else:
        problems.append(f"only {len(subjects)} subject(s): a per-person split needs at least 3")

    if len(subjects) < MIN_SUBJECTS_FOR_METRICS:
        warnings.append(f"{len(subjects)} subjects (<{MIN_SUBJECTS_FOR_METRICS}): enough to prove the "
                        "pipeline, not enough to claim real-world accuracy")

    print("\nwarnings:" if warnings else "\nwarnings: none")
    for w in warnings:
        print(f"  - {w}")
    if problems:
        print("blocking problems:")
        for p in problems:
            print(f"  - {p}")

    report = {
        "exercise": args.exercise, "clips": len(paths), "subjects": subjects,
        "frames": sum(c["frames"] for c in stats["per_clip"]),
        "windows": sum(c["windows"] for c in stats["per_clip"]),
        "sequence_length": cfg.sequence_length, "hop": cfg.hop,
        "per_clip": stats["per_clip"], "per_subject": stats["per_subject"],
        "classes": {h: list(classes[h]) for h in HEADS},
        "label_counts": {h: {classes[h][i]: n for i, n in stats["label_counts"][h].items()} for h in HEADS},
        "split": split, "warnings": warnings, "problems": problems,
    }
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nwrote {args.out}")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
