"""Windowing, the streaming buffer, and the per-person split."""
from __future__ import annotations

import numpy as np
import pytest

from ..preprocessing.pose_features import FEATURE_SIZE
from ..preprocessing.sequence import SequenceBuffer, pad_window, windows
from ..training.dataset import build_dataset, class_report, clip_windows, flip_features, split_subjects
from .fixtures import synthetic_clip, synthetic_dataset


def feats(n):
    return np.arange(n * FEATURE_SIZE, dtype=np.float32).reshape(n, FEATURE_SIZE)


def test_windows_shape_and_hop():
    got = list(windows(feats(50), length=10, hop=5))
    assert [start for start, _ in got] == list(range(0, 41, 5))
    assert all(w.shape == (10, FEATURE_SIZE) for _, w in got)


def test_window_shorter_than_length_yields_nothing():
    assert list(windows(feats(5), length=10, hop=1)) == []


def test_windows_skip_mostly_invalid_stretches():
    valid = np.ones(50, bool)
    valid[10:40] = False
    kept = [start for start, _ in windows(feats(50), length=10, hop=5, valid=valid)]
    assert 0 in kept and 10 not in kept and 20 not in kept


def test_windows_reject_wrong_feature_size():
    with pytest.raises(ValueError):
        list(windows(np.zeros((10, 7), np.float32), length=5))


def test_pad_window_left_pads_with_first_frame():
    padded = pad_window(feats(3), 5)
    assert padded.shape == (5, FEATURE_SIZE)
    assert np.array_equal(padded[0], padded[1]) and np.array_equal(padded[2], feats(3)[0])


def test_buffer_keeps_last_n_and_clears_on_gap():
    buf = SequenceBuffer(5)
    assert buf.window() is None and not buf.ready
    for i in range(7):
        buf.push(np.full(FEATURE_SIZE, i, np.float32))
    assert buf.ready and buf.filled == 5
    win = buf.window()
    assert win[0][0] == 2 and win[-1][0] == 6
    buf.push(np.zeros(FEATURE_SIZE, np.float32), valid=False)
    assert buf.filled == 0 and buf.window() is None


def test_buffer_warmup_is_padded():
    buf = SequenceBuffer(4)
    buf.push(np.full(FEATURE_SIZE, 9, np.float32))
    win = buf.window()
    assert win.shape == (4, FEATURE_SIZE) and (win == 9).all()


def test_clip_windows_label_is_the_last_frame():
    clip = synthetic_clip("p1", reps=2, frames_per_rep=30)
    x, y = clip_windows(clip, length=20, hop=10)
    assert len(x) == len(y) and x.shape[1:] == (20, FEATURE_SIZE)
    assert y[0]["phase"] == int(clip["phase"][19])


def test_split_is_by_person_and_deterministic():
    subjects = [f"p{i}" for i in range(10)]
    a = split_subjects(subjects, 0.2, 0.2, seed=7)
    b = split_subjects(list(reversed(subjects)), 0.2, 0.2, seed=7)
    assert a == b
    assert not (set(a["train"]) & set(a["test"]))
    assert not (set(a["train"]) & set(a["val"]))
    assert not (set(a["val"]) & set(a["test"]))
    assert sum(len(v) for v in a.values()) == len(subjects)


def test_split_refuses_too_few_people():
    with pytest.raises(ValueError):
        split_subjects(["p1", "p2"], 0.2, 0.2, seed=1)


def test_dataset_splits_never_share_a_person(tmp_path):
    data_dir = synthetic_dataset(tmp_path)
    data = build_dataset(data_dir, length=20, hop=10, val_ratio=0.25, test_ratio=0.25, seed=3)
    sets = {k: set(v["subjects"]) for k, v in data.items()}
    assert sets["train"] and sets["test"]
    assert not (sets["train"] & sets["test"]) and not (sets["train"] & sets["val"])
    report = class_report(data)
    assert report["train"]["windows"] == len(data["train"]["x"])


def test_missing_dataset_says_so_clearly(tmp_path):
    with pytest.raises(FileNotFoundError, match="no dataset yet|no processed clips"):
        build_dataset(tmp_path / "empty", length=20, hop=5, val_ratio=0.2, test_ratio=0.2, seed=1)


def test_flip_augmentation_mirrors_without_changing_shape():
    clip = synthetic_clip("p1", reps=1, frames_per_rep=20)
    x, _ = clip_windows(clip, length=10, hop=5)
    flipped = flip_features(x)
    assert flipped.shape == x.shape
    assert np.allclose(flip_features(flipped), x, atol=1e-6)   # flipping twice is a no-op
    assert not np.allclose(flipped, x)


def test_flip_augmentation_swaps_sides_and_mirrors_x():
    from .fixtures import skeleton
    from ..preprocessing.normalize import L_KN, R_KN
    from ..preprocessing.pose_features import FeatureExtractor
    vec, _ = FeatureExtractor().push(skeleton(knee_deg=110), 1.0, 0.0)
    flipped = flip_features(vec.reshape(1, -1))[0]
    # left and right joint channels trade places
    assert np.isclose(flipped[132 + 4], vec[132 + 5]) and np.isclose(flipped[132 + 5], vec[132 + 4])
    assert np.isclose(flipped[132 + 6], vec[132 + 7]) and np.isclose(flipped[132 + 7], vec[132 + 6])
    # the left knee lands where the right knee was, mirrored in x
    assert np.isclose(flipped[L_KN * 4], -vec[R_KN * 4], atol=1e-6)
    assert np.isclose(flipped[L_KN * 4 + 1], vec[R_KN * 4 + 1], atol=1e-6)
    # channels that have no side (torso lean/tilt) are untouched
    assert np.allclose(flipped[132 + 8: 132 + 10], vec[132 + 8: 132 + 10])
