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
from ..preprocessing.pose_features import FEATURE_SIZE, clip_features
from ..training.config import MISTAKES, PHASES


def skeleton(knee_deg: float = 175.0, x: float = 0.5, y: float = 0.5, scale: float = 1.0,
             vis: float = 0.9, missing=(), off_frame: bool = False) -> list[dict]:
    """A standing figure whose knees bend by `knee_deg`."""
    lm = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 0.05} for _ in range(33)]
    shift = 0.9 if off_frame else 0.0

    def put(i, dx, dy):
        lm[i] = {"x": x + dx * scale + shift, "y": y + dy * scale, "z": 0.01 * dx * scale, "visibility": vis}

    put(L_SH, -0.02, -0.25); put(R_SH, 0.02, -0.25)
    put(L_EL, -0.06, -0.10); put(R_EL, 0.06, -0.10)
    put(L_WR, -0.08, 0.02); put(R_WR, 0.08, 0.02)
    put(L_HIP, -0.03, 0.0); put(R_HIP, 0.03, 0.0)
    k = (180.0 - knee_deg) / 180.0 * 0.12
    put(L_KN, -0.03 + k, 0.16); put(R_KN, 0.03 + k, 0.16)
    put(L_AN, -0.03, 0.32); put(R_AN, 0.03, 0.32)
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
