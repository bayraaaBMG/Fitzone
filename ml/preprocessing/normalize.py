"""Skeleton normalization (feature spec v1).

Mirrored byte-for-byte in js/ai/ml-features.js — any change here must be made
there too, and ml/tests/test_js_parity.py fails the build if the two drift.

The goal is a skeleton that no longer depends on where the person stands, how
far they are from the camera, how tall they are, or how the image is stretched,
while keeping the geometry that actually carries form information (a leaning
torso stays leaning).
"""
from __future__ import annotations

import numpy as np

FEATURE_VERSION = 1
NUM_LANDMARKS = 33

# a point below this visibility, off-frame, or non-finite is treated as unseen.
# Same thresholds the shipping rule engine uses (js/pose-rules.js).
MIN_VISIBILITY = 0.3
FRAME_MARGIN = 0.05
MIN_TORSO = 1e-3

# MediaPipe Pose landmark indices
NOSE = 0
L_SH, R_SH = 11, 12
L_EL, R_EL = 13, 14
L_WR, R_WR = 15, 16
L_HIP, R_HIP = 23, 24
L_KN, R_KN = 25, 26
L_AN, R_AN = 27, 28


def as_array(landmarks) -> np.ndarray:
    """(33, 4) float32 [x, y, z, visibility] from MediaPipe output or a list."""
    out = np.zeros((NUM_LANDMARKS, 4), dtype=np.float32)
    if landmarks is None:
        return out
    for i, lm in enumerate(landmarks):
        if i >= NUM_LANDMARKS or lm is None:
            break
        if isinstance(lm, dict):
            x, y, z = lm.get("x", 0.0), lm.get("y", 0.0), lm.get("z", 0.0)
            v = lm.get("visibility", 1.0)
        elif isinstance(lm, (list, tuple, np.ndarray)):
            x, y, z = (list(lm) + [0.0, 0.0, 0.0])[:3]
            v = lm[3] if len(lm) > 3 else 1.0
        else:  # mediapipe NormalizedLandmark
            x, y, z = lm.x, lm.y, lm.z
            v = getattr(lm, "visibility", 1.0)
        out[i] = (x, y, z, 1.0 if v is None else v)
    return out


def valid_mask(pts: np.ndarray) -> np.ndarray:
    """Which landmarks may be used: visible, finite, and inside the image."""
    finite = np.isfinite(pts).all(axis=1)
    x, y, v = pts[:, 0], pts[:, 1], pts[:, 3]
    inside = (
        (x >= -FRAME_MARGIN) & (x <= 1.0 + FRAME_MARGIN)
        & (y >= -FRAME_MARGIN) & (y <= 1.0 + FRAME_MARGIN)
    )
    return finite & inside & (v >= MIN_VISIBILITY)


def normalize_frame(landmarks, aspect: float = 1.0):
    """Returns (points (33,4) float32, pelvis (2,) float32, scale float, valid bool).

    points are pelvis-centred and torso-scaled; unseen points are all-zero.
    pelvis/scale are in aspect-corrected image units (needed for velocity).
    """
    pts = as_array(landmarks)
    mask = valid_mask(pts)
    out = np.zeros_like(pts)
    pelvis = np.zeros(2, dtype=np.float32)

    if not (mask[L_HIP] and mask[R_HIP] and (mask[L_SH] or mask[R_SH])):
        return out, pelvis, 0.0, False

    xyz = pts[:, :3].astype(np.float32).copy()
    xyz[:, 0] *= aspect  # angles must be real angles, not image-stretched ones
    xyz[:, 2] *= aspect

    hip_mid = (xyz[L_HIP] + xyz[R_HIP]) / 2.0
    if mask[L_SH] and mask[R_SH]:
        sh_mid = (xyz[L_SH] + xyz[R_SH]) / 2.0
    else:
        sh_mid = xyz[L_SH] if mask[L_SH] else xyz[R_SH]

    scale = float(np.hypot(sh_mid[0] - hip_mid[0], sh_mid[1] - hip_mid[1]))
    if not np.isfinite(scale) or scale < MIN_TORSO:
        return out, pelvis, 0.0, False

    centred = (xyz - hip_mid) / scale
    out[:, :3] = np.where(mask[:, None], centred, 0.0)
    out[:, 3] = np.where(mask, pts[:, 3], 0.0)
    pelvis = hip_mid[:2].astype(np.float32)
    return out.astype(np.float32), pelvis, scale, True
