"""Video -> MediaPipe landmarks -> feature vectors + per-frame labels (.npz).

    python -m ml.preprocessing.extract_poses --exercise squat \
        --video ml/data/raw/squat/correct/p001_squat_correct_01.mp4 \
        --annotations ml/data/annotations/squat.jsonl \
        --out ml/data/processed/squat

Runs locally on recorded, consented video (see ml/data/README.md). Nothing here
touches the app or its Firebase project, and no video leaves the machine: only
landmark-derived features are written.

Uses the same MediaPipe Pose model family as the browser, so training features
match inference features.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from .pose_features import FEATURE_SIZE, FeatureExtractor
from ..training.config import PHASES, MISTAKES


def load_annotation(path: str | Path, clip_id: str) -> dict:
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("clip_id") == clip_id:
            return row
    raise KeyError(f"{clip_id} is not annotated in {path}")


def frame_labels(annotation: dict, n_frames: int, exercise: str):
    """Per-frame phase / form / mistake / rep_valid from the rep boundaries."""
    mistakes = MISTAKES[exercise]
    phase = np.zeros(n_frames, np.int64)          # default: "start"
    form = np.zeros(n_frames, np.int64)           # default: "correct"
    mistake = np.zeros(n_frames, np.int64)        # default: "none"
    rep_valid = np.zeros(n_frames, np.int64)
    for rep in annotation.get("reps", []):
        start, bottom, end = int(rep["start"]), int(rep["bottom"]), int(rep["end"])
        m = rep.get("mistake", annotation.get("mistake", "none"))
        if m not in mistakes:
            raise ValueError(f"{annotation['clip_id']}: unknown mistake {m!r} for {exercise}")
        for i in range(max(0, start), min(n_frames, bottom)):
            phase[i] = PHASES.index("descending")
        for i in range(max(0, bottom), min(n_frames, min(bottom + 3, end))):
            phase[i] = PHASES.index("bottom")
        for i in range(max(0, min(bottom + 3, end)), min(n_frames, end)):
            phase[i] = PHASES.index("ascending")
        if 0 <= end < n_frames:
            phase[end] = PHASES.index("complete")
            rep_valid[end] = 1 if rep.get("valid", True) else 0
        for i in range(max(0, start), min(n_frames, end + 1)):
            form[i] = 0 if m == "none" else 1
            mistake[i] = mistakes.index(m)
    return phase, form, mistake, rep_valid


def extract(video_path: str | Path, annotation: dict, exercise: str, model_path: str | None = None):
    """Returns the arrays for one clip. Requires mediapipe + opencv locally.

    Uses ml/preprocessing/mp_pose.py — the same PoseLandmarker model and API the
    browser runs — so training features come from the landmarks users produce.
    """
    from .mp_pose import video_landmarks

    frames, fps, aspect = video_landmarks(video_path)
    fps = fps or float(annotation.get("fps", 30))

    extractor = FeatureExtractor()
    feats, valid, raw = [], [], []
    for index, landmarks in enumerate(frames):
        vec, is_valid = extractor.push(landmarks, aspect, index * 1000.0 / fps)
        feats.append(vec); valid.append(is_valid)
        # keep the landmarks themselves: ml/eval/rep_compare.py replays the
        # shipping rule engine over them to compare rep counts
        raw.append(np.array([[p["x"], p["y"], p["z"], p["visibility"]] for p in landmarks], dtype=np.float32)
                   if landmarks else np.zeros((33, 4), np.float32))

    features = np.stack(feats).astype(np.float32) if feats else np.zeros((0, FEATURE_SIZE), np.float32)
    phase, form, mistake, rep_valid = frame_labels(annotation, len(features), exercise)
    return {
        "features": features,
        "landmarks": np.stack(raw).astype(np.float32) if raw else np.zeros((0, 33, 4), np.float32),
        "aspect": np.array(aspect, dtype=np.float32),
        "valid": np.array(valid, dtype=bool),
        "phase": phase, "form": form, "mistake": mistake, "rep_valid": rep_valid,
        "subject_id": np.array(annotation["subject_id"]),
        "exercise": np.array(exercise),
        "fps": np.array(fps, dtype=np.float32),
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Extract pose features from one recorded clip")
    ap.add_argument("--exercise", required=True, choices=sorted(MISTAKES))
    ap.add_argument("--video", required=True)
    ap.add_argument("--annotations", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args(argv)

    clip_id = Path(args.video).stem
    annotation = load_annotation(args.annotations, clip_id)
    data = extract(args.video, annotation, args.exercise)
    out_dir = Path(args.out); out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{clip_id}.npz"
    np.savez_compressed(out_path, **data)
    usable = int(data["valid"].sum())
    print(f"{clip_id}: {len(data['features'])} frames, {usable} with a usable skeleton -> {out_path}")
    if usable < 0.5 * max(1, len(data["features"])):
        print("WARNING: more than half the frames had no usable skeleton — check framing and lighting.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
