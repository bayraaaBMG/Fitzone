"""SYNTHETIC fixtures — pipeline tests only.

These skeletons are generated from simple geometry. They exercise shapes,
dtypes and code paths; they are not exercise data and must never be used to
train a published model or to report accuracy. Real data comes from recorded,
consented video (ml/data/README.md).
"""
from __future__ import annotations

import numpy as np

from ..preprocessing.normalize import (
    L_SH, R_SH, L_EL, R_EL, L_WR, R_WR, L_HIP, R_HIP, L_KN, R_KN, L_AN, R_AN,
)
from ..preprocessing.normalize import as_array
from ..preprocessing.pose_features import FEATURE_SIZE, clip_features
from ..training.config import MISTAKES, PHASES


SEG = {"torso": 0.28, "upper_arm": 0.14, "forearm": 0.13, "thigh": 0.20, "shin": 0.20}


def _step(point, degrees: float, length: float):
    """Move `length` from `point` in a direction where 0 deg = up, 90 deg = right."""
    rad = np.radians(degrees)
    return (point[0] + np.sin(rad) * length, point[1] - np.cos(rad) * length)


def skeleton(knee_deg: float = 175.0, x: float = 0.5, y: float = 0.5, scale: float = 1.0,
             vis: float = 0.9, missing=(), off_frame: bool = False, lean_deg: float = 5.0) -> list[dict]:
    """A standing figure built from exact segment directions, so the knee angle
    really is `knee_deg` — the rule engine is thresholded on that angle, so an
    approximation here would test nothing."""
    lm = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 0.05} for _ in range(33)]
    shift = 0.9 if off_frame else 0.0
    bend = (180.0 - float(knee_deg)) / 2.0
    hip = (x, y)
    shoulder = _step(hip, lean_deg, SEG["torso"] * scale)
    elbow = _step(shoulder, 180.0, SEG["upper_arm"] * scale)
    wrist = _step(elbow, 180.0, SEG["forearm"] * scale)
    knee = _step(hip, 180.0 - bend, SEG["thigh"] * scale)
    ankle = _step(knee, 180.0 + bend, SEG["shin"] * scale)

    def put(i, point, dx):
        lm[i] = {"x": point[0] + dx * scale + shift, "y": point[1],
                 "z": 0.01 * dx * scale, "visibility": vis}

    put(L_SH, shoulder, -0.02); put(R_SH, shoulder, 0.02)
    put(L_EL, elbow, -0.02); put(R_EL, elbow, 0.02)
    put(L_WR, wrist, -0.02); put(R_WR, wrist, 0.02)
    put(L_HIP, hip, -0.03); put(R_HIP, hip, 0.03)
    put(L_KN, knee, -0.03); put(R_KN, knee, 0.03)
    put(L_AN, ankle, -0.03); put(R_AN, ankle, 0.03)
    for i in missing:
        lm[i] = {"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 0.05}
    return lm


def rep_frames(depth: float = 90.0, frames_per_rep: int = 30, reps: int = 4):
    """A synthetic squat-ish cycle: 175 -> depth -> 175, repeated."""
    out = []
    for _ in range(reps):
        half = frames_per_rep // 2
        for i in range(half):
            out.append(skeleton(175.0 - (175.0 - depth) * i / max(1, half - 1)))
        for i in range(frames_per_rep - half):
            out.append(skeleton(depth + (175.0 - depth) * i / max(1, frames_per_rep - half - 1)))
    return out


def synthetic_clip(subject: str, exercise: str = "squat", reps: int = 4, mistake: str = "none",
                   frames_per_rep: int = 30, seed: int = 0) -> dict:
    """One clip's worth of features + per-frame labels, shaped like a real .npz."""
    rng = np.random.default_rng(seed)
    depth = 90.0 if mistake == "none" else 140.0
    frames = rep_frames(depth=depth, frames_per_rep=frames_per_rep, reps=reps)
    features = clip_features(frames, aspect=1.0, fps=30.0)
    features = features + rng.normal(0.0, 1e-3, features.shape).astype(np.float32)
    n = len(features)

    phase = np.zeros(n, np.int64)
    form = np.zeros(n, np.int64)
    mistake_idx = np.zeros(n, np.int64)
    rep_valid = np.zeros(n, np.int64)
    classes = MISTAKES[exercise]
    for r in range(reps):
        start = r * frames_per_rep
        bottom = start + frames_per_rep // 2
        end = min(n - 1, start + frames_per_rep - 1)
        phase[start:bottom] = PHASES.index("descending")
        phase[bottom:bottom + 3] = PHASES.index("bottom")
        phase[bottom + 3:end] = PHASES.index("ascending")
        phase[end] = PHASES.index("complete")
        rep_valid[end] = 1 if mistake == "none" else 0
        form[start:end + 1] = 0 if mistake == "none" else 1
        mistake_idx[start:end + 1] = classes.index(mistake)
    return {
        "features": features.astype(np.float32),
        "landmarks": np.stack([as_array(f) for f in frames]).astype(np.float32),
        "aspect": np.array(1.0, np.float32),
        "valid": np.ones(n, dtype=bool),
        "phase": phase, "form": form, "mistake": mistake_idx, "rep_valid": rep_valid,
        "subject_id": np.array(subject), "exercise": np.array(exercise), "fps": np.array(30.0, np.float32),
    }


def synthetic_dataset(tmp_path, subjects=("p1", "p2", "p3", "p4"), exercise: str = "squat"):
    """Writes synthetic clips as .npz so the real loader path is exercised."""
    out = tmp_path / exercise
    out.mkdir(parents=True, exist_ok=True)
    for i, subject in enumerate(subjects):
        for j, mistake in enumerate(("none", MISTAKES[exercise][1])):
            clip = synthetic_clip(subject, exercise, mistake=mistake, seed=i * 10 + j)
            np.savez_compressed(out / f"{subject}_{exercise}_{mistake}_{j}.npz", **clip)
    return out


assert FEATURE_SIZE == 158  # keeps the fixtures honest if the spec ever changes
