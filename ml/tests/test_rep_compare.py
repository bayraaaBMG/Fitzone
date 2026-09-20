"""Rep comparison: the shipping rule engine replayed over stored landmarks."""
from __future__ import annotations

import shutil

import numpy as np
import pytest

from ..eval.rep_compare import human_reps, match, prf, run_driver
from ..training.config import PHASES
from .fixtures import synthetic_clip

needs_node = pytest.mark.skipif(shutil.which("node") is None, reason="node runs the browser rule engine")


def test_match_pairs_counted_reps_to_annotated_ones():
    tp, fp, fn = match([10, 40, 70], [12, 41, 300], tolerance_frames=5)
    assert (tp, fp, fn) == (2, 1, 1)


def test_match_is_greedy_not_double_counting():
    tp, fp, fn = match([10, 11], [10], tolerance_frames=5)
    assert (tp, fp, fn) == (1, 1, 0)


def test_prf_maths():
    assert prf(3, 1, 1) == {"tp": 3, "false_positive": 1, "missed": 1,
                            "precision": 0.75, "recall": 0.75, "f1": 0.75}
    assert prf(0, 0, 0)["f1"] == 0.0


def test_human_reps_reads_the_labels():
    clip = synthetic_clip("p1", reps=3, frames_per_rep=30)
    valid, attempted = human_reps(clip)
    assert len(attempted) == 3 and len(valid) == 3
    assert all(clip["phase"][i] == PHASES.index("complete") for i in attempted)

    shallow = synthetic_clip("p1", reps=3, frames_per_rep=30, mistake="shallow")
    valid, attempted = human_reps(shallow)
    assert len(attempted) == 3 and len(valid) == 0  # completed but not valid reps


@needs_node
def test_rule_engine_counts_synthetic_reps():
    clip = synthetic_clip("p1", reps=4, frames_per_rep=30)
    out = run_driver("squat", clip, None, sequence_length=45)
    assert out["ai"] is None
    assert out["rules"]["reps"] >= 3, out["rules"]
    assert len(out["rules"]["frames"]) == out["rules"]["reps"]


@needs_node
def test_shallow_reps_are_not_counted_by_the_rule_engine():
    clip = synthetic_clip("p1", reps=4, frames_per_rep=30, mistake="shallow")
    out = run_driver("squat", clip, None, sequence_length=45)
    assert out["rules"]["reps"] == 0, out["rules"]


@needs_node
def test_ai_veto_path_runs_through_the_shipping_controller():
    clip = synthetic_clip("p1", reps=4, frames_per_rep=30)
    n = len(clip["features"])
    veto = [{"phase": {"label": "ascending", "confidence": 0.9},
             "form": {"label": "incorrect", "confidence": 0.9},
             "mistake": {"label": "incomplete_rep", "confidence": 0.95},
             "rep_valid": {"label": "no", "confidence": 0.95}}] * n
    with_ai = run_driver("squat", clip, veto, sequence_length=16)
    rules_only = run_driver("squat", clip, None, sequence_length=16)
    assert with_ai["ai"] is not None
    # AI may only take reps away, never add them
    assert with_ai["ai"]["reps"] <= rules_only["rules"]["reps"]
    assert with_ai["ai"]["vetoes"] >= 1


@needs_node
def test_confident_valid_predictions_leave_the_count_alone():
    clip = synthetic_clip("p1", reps=4, frames_per_rep=30)
    n = len(clip["features"])
    good = [{"phase": {"label": "ascending", "confidence": 0.9},
             "form": {"label": "correct", "confidence": 0.95},
             "mistake": {"label": "none", "confidence": 0.95},
             "rep_valid": {"label": "yes", "confidence": 0.95}}] * n
    out = run_driver("squat", clip, good, sequence_length=16)
    rules_only = run_driver("squat", clip, None, sequence_length=16)
    assert out["ai"]["reps"] == rules_only["rules"]["reps"] and out["ai"]["vetoes"] == 0


@needs_node
def test_both_engines_can_be_replayed_on_the_same_clip():
    """before/after on identical input (ml/eval/baseline/pose-rules-v1.js)."""
    clip = synthetic_clip("p1", reps=4, frames_per_rep=30)
    current = run_driver("squat", clip, None, sequence_length=45, engine="current")
    baseline = run_driver("squat", clip, None, sequence_length=45, engine="baseline")
    assert current["rules"]["reps"] >= 3 and baseline["rules"]["reps"] >= 3
    # clean synthetic reps: both engines agree; the differences show up on the
    # adversarial cases, which is what the stress harness is for
    assert abs(current["rules"]["reps"] - baseline["rules"]["reps"]) <= 1


@needs_node
def test_new_engine_rejects_a_knee_bend_that_never_descends():
    """the "sit back" false positive this task was opened for."""
    import numpy as np
    from ..preprocessing.normalize import L_SH, L_HIP, L_KN, L_AN, L_EL, L_WR

    def frame(d):
        lm = np.zeros((33, 4), np.float32)
        lm[:, 3] = 0.05
        for idx, (x, y) in ((L_SH, (0.48, 0.10)), (L_HIP, (0.5, 0.35)), (L_KN, (0.5 + d, 0.55)),
                            (L_AN, (0.5, 0.75)), (L_EL, (0.44, 0.22)), (L_WR, (0.42, 0.32))):
            lm[idx] = (x, y, 0.0, 0.9)
        return lm

    seq = []
    for _ in range(5):
        seq += [frame(0.01)] * 5
        seq += [frame(0.01 + 0.29 * i / 7) for i in range(8)]
        seq += [frame(0.30)] * 3
        seq += [frame(0.30 - 0.29 * i / 7) for i in range(8)]
    clip = synthetic_clip("p1", reps=1, frames_per_rep=30)
    clip = {**clip, "landmarks": np.stack(seq), "valid": np.ones(len(seq), bool)}
    current = run_driver("squat", clip, None, sequence_length=45, engine="current")
    baseline = run_driver("squat", clip, None, sequence_length=45, engine="baseline")
    assert current["rules"]["reps"] == 0, current["rules"]
    assert baseline["rules"]["reps"] > 0, "baseline was expected to miscount this"


@needs_node
def test_clip_without_landmarks_is_refused_not_guessed():
    clip = synthetic_clip("p1", reps=2, frames_per_rep=30)
    del clip["landmarks"]
    with pytest.raises(SystemExit, match="landmarks"):
        run_driver("squat", clip, None, sequence_length=45)


def test_frame_predictions_shape(tmp_path):
    torch = pytest.importorskip("torch")
    from ..eval.rep_compare import frame_predictions
    from ..preprocessing.pose_features import FEATURE_SIZE
    from ..training.config import TrainConfig
    from ..training.model import ExerciseNet

    cfg = TrainConfig.for_exercise("squat")
    model = ExerciseNet(FEATURE_SIZE, cfg.head_sizes, hidden=16).eval()
    clip = synthetic_clip("p1", reps=1, frames_per_rep=20)
    preds = frame_predictions(model, clip, length=16, exercise="squat")
    assert len(preds) == len(clip["features"])
    first = preds[0]
    assert set(first) == {"phase", "form", "mistake", "rep_valid"}
    assert all(0.0 <= v["confidence"] <= 1.0 for v in first.values())
    assert first["mistake"]["label"] in cfg_mistakes()


def cfg_mistakes():
    from ..training.config import MISTAKES
    return MISTAKES["squat"]
