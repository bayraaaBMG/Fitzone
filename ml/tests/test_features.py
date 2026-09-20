"""Feature extraction (spec v1)."""
from __future__ import annotations

import numpy as np
import pytest

from ..preprocessing.normalize import L_HIP, R_HIP, L_SH, L_KN, R_KN, L_AN, R_AN, normalize_frame
from ..preprocessing.pose_features import (
    ANGLE_NA, FEATURE_SIZE, MAX_PELVIS_VEL, MAX_SHAPE_VEL, FeatureExtractor, clip_features,
)
from .fixtures import skeleton, rep_frames


def push(lm, aspect=1.0, ts=0.0):
    return FeatureExtractor().push(lm, aspect, ts)


def test_vector_shape_and_dtype():
    vec, valid = push(skeleton())
    assert valid and vec.shape == (FEATURE_SIZE,) and vec.dtype == np.float32
    assert np.isfinite(vec).all()


def test_pelvis_centred_and_torso_scaled():
    pts, pelvis, scale, ok = normalize_frame(skeleton(), 1.0)
    assert ok
    mid = (pts[L_HIP, :2] + pts[R_HIP, :2]) / 2
    assert np.allclose(mid, 0.0, atol=1e-6)
    assert abs(abs(pts[L_SH, 1]) - 1.0) < 0.25   # torso is ~1 unit after scaling
    assert scale > 0 and np.isfinite(pelvis).all()


def test_invariant_to_position_and_distance():
    a, _ = push(skeleton(x=0.5, y=0.5, scale=1.0))
    b, _ = push(skeleton(x=0.2, y=0.7, scale=0.6))
    assert np.max(np.abs(a[:144] - b[:144])) < 1e-5


def test_aspect_correction_changes_geometry():
    square, _ = push(skeleton(), aspect=1.0)
    wide, _ = push(skeleton(), aspect=1.78)
    assert not np.allclose(square[:132], wide[:132])


def test_shape_channels_track_the_movement():
    straight, _ = push(skeleton(knee_deg=175))
    bent, _ = push(skeleton(knee_deg=80))
    assert bent[132 + 6] < straight[132 + 6] - 0.05      # knee channel
    assert 0.0 <= bent[132 + 6] <= 1.0


def test_missing_joints_are_marked_not_invented():
    vec, valid = push(skeleton(missing=(L_KN, R_KN, L_AN, R_AN)))
    assert valid
    assert vec[132 + 6] == ANGLE_NA and vec[132 + 7] == ANGLE_NA   # knees
    assert vec[132 + 9] == ANGLE_NA                                # torso tilt needs ankles
    assert vec[L_KN * 4] == 0.0 and vec[L_KN * 4 + 3] == 0.0       # zeroed, visibility too


@pytest.mark.parametrize("bad", [
    None,
    [],
    skeleton(missing=(L_HIP, R_HIP)),
    skeleton(vis=0.05),
    skeleton(off_frame=True),
])
def test_unusable_frames_are_rejected(bad):
    vec, valid = push(bad)
    assert not valid and not vec.any()


def test_non_finite_input_does_not_crash():
    lm = skeleton()
    lm[L_SH]["x"] = float("nan")
    lm[L_KN]["y"] = float("inf")
    vec, valid = push(lm)
    assert np.isfinite(vec).all()


def test_velocity_is_per_second_not_per_frame():
    slow = FeatureExtractor(); slow.push(skeleton(knee_deg=175), 1.0, 0)
    v_slow = slow.push(skeleton(knee_deg=120), 1.0, 80)[0][144 + 6]
    fast = FeatureExtractor(); fast.push(skeleton(knee_deg=175), 1.0, 0)
    fast.push(skeleton(knee_deg=147.5), 1.0, 40)
    v_fast = fast.push(skeleton(knee_deg=120), 1.0, 80)[0][144 + 6]
    assert abs(v_slow - v_fast) < 0.05


def test_velocity_clamped_and_reset_across_gaps():
    fx = FeatureExtractor()
    fx.push(skeleton(knee_deg=175), 1.0, 0)
    vec, _ = fx.push(skeleton(knee_deg=60), 1.0, 0.5)     # absurdly fast
    assert np.all(np.abs(vec[144:156]) <= MAX_SHAPE_VEL)
    assert np.all(np.abs(vec[156:]) <= MAX_PELVIS_VEL)

    fx.push(None, 1.0, 100)                               # person lost
    after, valid = fx.push(skeleton(knee_deg=90), 1.0, 200)
    assert valid and not after[144:].any()                # no invented motion across the gap


def test_first_frame_has_no_velocity():
    vec, _ = push(skeleton())
    assert not vec[144:].any()


def test_clip_features_matches_streaming():
    frames = rep_frames(reps=2, frames_per_rep=12)
    batch = clip_features(frames, aspect=1.0, fps=30.0)
    fx = FeatureExtractor()
    streamed = np.stack([fx.push(lm, 1.0, i * 1000.0 / 30.0)[0] for i, lm in enumerate(frames)])
    assert batch.shape == (len(frames), FEATURE_SIZE)
    assert np.allclose(batch, streamed)
