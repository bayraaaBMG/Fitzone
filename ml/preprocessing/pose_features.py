"""Per-frame feature vector (feature spec v1) — 158 floats.

    0..131   33 landmarks x (x, y, z, visibility), normalized (see normalize.py)
    132..143 12 shape channels: 10 joint angles / 180, then shoulder-width and
             hip-width divided by torso length and halved. ANGLE_NA (-1) when
             the joints involved are not visible.
    144..157 14 motion channels: the 12 shape-channel deltas per second
             (clamped +-10) and pelvis dx, dy per second in torso units
             (clamped +-5).

Angles use x/y only (z from a single camera is too noisy to threshold on); the
raw z values still reach the model through the landmark channels.

Mirrored in js/ai/ml-features.js; ml/tests/test_js_parity.py guards the pair.
"""
from __future__ import annotations

import numpy as np

from .normalize import (  # noqa: F401  (re-exported on purpose)
    FEATURE_VERSION, NUM_LANDMARKS, MIN_VISIBILITY, FRAME_MARGIN, MIN_TORSO,
    L_SH, R_SH, L_EL, R_EL, L_WR, R_WR, L_HIP, R_HIP, L_KN, R_KN, L_AN, R_AN,
    as_array, valid_mask, normalize_frame,
)

FEATURE_SIZE = 158
SHAPE_CHANNELS = 12
MOTION_CHANNELS = 14
ANGLE_NA = -1.0
MAX_SHAPE_VEL = 10.0
MAX_PELVIS_VEL = 5.0
DT_MIN_S = 0.001
DT_MAX_S = 0.250

SHAPE_NAMES = (
    "elbow_l", "elbow_r", "shoulder_l", "shoulder_r", "hip_l", "hip_r",
    "knee_l", "knee_r", "torso_lean", "torso_tilt", "shoulder_w", "hip_w",
)


def _angle(a, b, c) -> float:
    """Angle ABC in degrees, from x/y."""
    v1x, v1y = a[0] - b[0], a[1] - b[1]
    v2x, v2y = c[0] - b[0], c[1] - b[1]
    d = float(np.hypot(v1x, v1y) * np.hypot(v2x, v2y))
    if d <= 0.0:
        return 180.0
    cos = (v1x * v2x + v1y * v2y) / d
    return float(np.degrees(np.arccos(max(-1.0, min(1.0, cos)))))


def shape_channels(pts: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """12 scale-free shape channels in [0, 1], or ANGLE_NA where unavailable."""
    out = np.full(SHAPE_CHANNELS, ANGLE_NA, dtype=np.float32)

    def ang(i, j, k):
        if mask[i] and mask[j] and mask[k]:
            return _angle(pts[i], pts[j], pts[k]) / 180.0
        return ANGLE_NA

    out[0] = ang(L_SH, L_EL, L_WR)
    out[1] = ang(R_SH, R_EL, R_WR)
    out[2] = ang(L_HIP, L_SH, L_EL)
    out[3] = ang(R_HIP, R_SH, R_EL)
    out[4] = ang(L_SH, L_HIP, L_KN)
    out[5] = ang(R_SH, R_HIP, R_KN)
    out[6] = ang(L_HIP, L_KN, L_AN)
    out[7] = ang(R_HIP, R_KN, R_AN)

    if mask[L_SH] and mask[R_SH]:
        sh_mid = (pts[L_SH, :2] + pts[R_SH, :2]) / 2.0
        # torso lean away from vertical; the skeleton is pelvis-centred, so the
        # pelvis itself is the origin
        out[8] = float(np.degrees(np.arctan2(abs(sh_mid[0]), abs(sh_mid[1])))) / 180.0
        if mask[L_AN] and mask[R_AN]:
            an_mid = (pts[L_AN, :2] + pts[R_AN, :2]) / 2.0
            dx, dy = abs(sh_mid[0] - an_mid[0]), abs(sh_mid[1] - an_mid[1])
            out[9] = float(np.degrees(np.arctan2(dy, dx))) / 180.0  # 0 = lying flat
        out[10] = min(2.0, float(abs(pts[L_SH, 0] - pts[R_SH, 0]))) / 2.0
    if mask[L_HIP] and mask[R_HIP]:
        out[11] = min(2.0, float(abs(pts[L_HIP, 0] - pts[R_HIP, 0]))) / 2.0
    return out


def motion_channels(shape: np.ndarray, prev_shape, pelvis, prev_pelvis, scale: float, dt_s: float) -> np.ndarray:
    """Per-second change of the shape channels plus pelvis drift in torso units."""
    out = np.zeros(MOTION_CHANNELS, dtype=np.float32)
    if prev_shape is None or dt_s <= 0.0:
        return out
    dt = min(DT_MAX_S, max(DT_MIN_S, dt_s))
    usable = (shape != ANGLE_NA) & (prev_shape != ANGLE_NA)
    delta = np.where(usable, (shape - prev_shape) / dt, 0.0)
    out[:SHAPE_CHANNELS] = np.clip(delta, -MAX_SHAPE_VEL, MAX_SHAPE_VEL)
    if prev_pelvis is not None and scale >= MIN_TORSO:
        drift = (np.asarray(pelvis, dtype=np.float32) - np.asarray(prev_pelvis, dtype=np.float32)) / scale / dt
        out[SHAPE_CHANNELS:] = np.clip(drift, -MAX_PELVIS_VEL, MAX_PELVIS_VEL)
    return out


class FeatureExtractor:
    """Streaming extractor: one instance per video clip or per camera session.

    push() returns (vector (158,) float32, valid). An invalid frame (no person,
    folded skeleton) returns zeros with valid=False and resets motion history so
    the next frame does not invent a huge velocity across the gap.
    """

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._prev_shape = None
        self._prev_pelvis = None
        self._prev_ts = None

    def push(self, landmarks, aspect: float = 1.0, ts_ms: float = 0.0):
        pts, pelvis, scale, ok = normalize_frame(landmarks, aspect)
        if not ok:
            self.reset()
            return np.zeros(FEATURE_SIZE, dtype=np.float32), False

        mask = valid_mask(as_array(landmarks))
        shape = shape_channels(pts, mask)
        dt_s = 0.0 if self._prev_ts is None else (float(ts_ms) - self._prev_ts) / 1000.0
        motion = motion_channels(shape, self._prev_shape, pelvis, self._prev_pelvis, scale, dt_s)

        vec = np.concatenate([pts.reshape(-1), shape, motion]).astype(np.float32)
        self._prev_shape, self._prev_pelvis, self._prev_ts = shape, pelvis, float(ts_ms)
        assert vec.shape[0] == FEATURE_SIZE
        return vec, True


def clip_features(frames, aspect: float = 1.0, fps: float = 30.0) -> np.ndarray:
    """(N, 158) for a whole clip; `frames` is a sequence of landmark lists."""
    fx = FeatureExtractor()
    step_ms = 1000.0 / float(fps)
    out = np.zeros((len(frames), FEATURE_SIZE), dtype=np.float32)
    for i, lm in enumerate(frames):
        vec, _ = fx.push(lm, aspect, i * step_ms)
        out[i] = vec
    return out
