"""Dataset assembly: processed clips -> windows -> per-person splits.

numpy only, so it can be tested without torch installed.

The split is BY SUBJECT. Splitting windows randomly puts frames of the same
person in train and test; the model then recognises the person rather than the
movement, and the reported accuracy is meaningless.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

import numpy as np

from ..preprocessing.pose_features import FEATURE_SIZE
from ..preprocessing.sequence import windows

HEADS = ("phase", "form", "mistake", "rep_valid")


def load_clip(path: str | Path) -> dict:
    """One processed clip: features (N,158), per-frame labels, subject id.

    Written by preprocessing/extract_poses.py as .npz with keys:
    features, valid, phase, form, mistake, rep_valid, subject_id, exercise.
    """
    with np.load(path, allow_pickle=False) as z:
        clip = {k: z[k] for k in z.files}
    feats = clip.get("features")
    if feats is None or feats.ndim != 2 or feats.shape[1] != FEATURE_SIZE:
        raise ValueError(f"{path}: features must be (N, {FEATURE_SIZE})")
    clip["subject_id"] = str(clip["subject_id"]) if "subject_id" in clip else Path(path).stem.split("_")[0]
    return clip


def clip_windows(clip: dict, length: int, hop: int):
    """Windows plus the label of each window's LAST frame (the decision frame)."""
    feats, valid = clip["features"], clip.get("valid")
    out_x, out_y = [], []
    for start, win in windows(feats, length=length, hop=hop, valid=valid):
        last = start + length - 1
        out_y.append({h: int(clip[h][last]) for h in HEADS if h in clip})
        out_x.append(win)
    if not out_x:
        return np.zeros((0, length, FEATURE_SIZE), np.float32), []
    return np.stack(out_x).astype(np.float32), out_y


def split_subjects(subjects, val_ratio: float, test_ratio: float, seed: int):
    """Deterministic, name-based split so re-runs and re-imports agree."""
    uniq = sorted(set(subjects))
    if len(uniq) < 3:
        raise ValueError(
            f"need at least 3 subjects for an honest split, got {len(uniq)}: {uniq}. "
            "Collect more people before reporting any accuracy."
        )
    ranked = sorted(uniq, key=lambda s: hashlib.sha256(f"{seed}:{s}".encode()).hexdigest())
    n_test = max(1, int(round(len(ranked) * test_ratio)))
    n_val = max(1, int(round(len(ranked) * val_ratio)))
    test, val, train = ranked[:n_test], ranked[n_test:n_test + n_val], ranked[n_test + n_val:]
    if not train:
        raise ValueError("split left no training subjects; collect more people")
    return {"train": train, "val": val, "test": test}


def flip_features(x: np.ndarray) -> np.ndarray:
    """Mirror left/right: negate normalized x and swap the paired channels.

    Cheap, label-preserving augmentation (a left-facing squat is still a squat)
    and the reason the feature spec does not rotate the skeleton.
    """
    from ..preprocessing.normalize import (
        L_SH, R_SH, L_EL, R_EL, L_WR, R_WR, L_HIP, R_HIP, L_KN, R_KN, L_AN, R_AN,
    )
    out = x.copy()
    pts = out[..., : 33 * 4].reshape(*out.shape[:-1], 33, 4)
    pts[..., 0] *= -1.0
    for a, b in ((L_SH, R_SH), (L_EL, R_EL), (L_WR, R_WR), (L_HIP, R_HIP), (L_KN, R_KN), (L_AN, R_AN)):
        pts[..., [a, b], :] = pts[..., [b, a], :]
    shape = out[..., 132:144]
    motion = out[..., 144:156]
    for a, b in ((0, 1), (2, 3), (4, 5), (6, 7)):  # paired joint channels
        shape[..., [a, b]] = shape[..., [b, a]]
        motion[..., [a, b]] = motion[..., [b, a]]
    out[..., 156] *= -1.0  # pelvis dx
    return out


def build_dataset(data_dir: str | Path, length: int, hop: int, val_ratio: float, test_ratio: float,
                  seed: int, flip_augment: bool = False):
    """Returns {split: {"x": (N,T,F), "y": {head: (N,)}, "subjects": [...]}}."""
    paths = sorted(Path(data_dir).glob("*.npz"))
    if not paths:
        raise FileNotFoundError(
            f"no processed clips in {data_dir}. AI V2 has no dataset yet — see ml/data/README.md; "
            "run ml/preprocessing/extract_poses.py on recorded, consented video first."
        )
    clips = [load_clip(p) for p in paths]
    splits = split_subjects([c["subject_id"] for c in clips], val_ratio, test_ratio, seed)
    out = {}
    for name, subs in splits.items():
        xs, ys, who = [], [], []
        for clip in clips:
            if clip["subject_id"] not in subs:
                continue
            x, y = clip_windows(clip, length, hop)
            if not len(x):
                continue
            xs.append(x); ys.extend(y); who.extend([clip["subject_id"]] * len(x))
        x = np.concatenate(xs) if xs else np.zeros((0, length, FEATURE_SIZE), np.float32)
        if name == "train" and flip_augment and len(x):
            x = np.concatenate([x, flip_features(x)])
            ys = ys + list(ys); who = who + list(who)
        out[name] = {
            "x": x,
            "y": {h: np.array([d[h] for d in ys], dtype=np.int64) for h in HEADS if ys and h in ys[0]},
            "subjects": who,
        }
    return out


def class_report(dataset: dict) -> dict:
    """Class balance per split and head — printed before training, stored after."""
    rep = {}
    for split, d in dataset.items():
        rep[split] = {
            "windows": int(len(d["x"])),
            "subjects": sorted(set(d["subjects"])),
            "classes": {h: dict(sorted(Counter(v.tolist()).items())) for h, v in d["y"].items()},
        }
    return rep


def save_report(report: dict, path: str | Path) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(report, indent=2), encoding="utf-8")
