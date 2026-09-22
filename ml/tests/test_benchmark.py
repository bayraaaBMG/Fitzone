"""Real-video benchmark wiring. Uses SYNTHETIC landmarks in place of extracted
video — it checks the bookkeeping (validation, metrics, grouping, regression
lists, report), never accuracy."""
from __future__ import annotations

import json
import shutil

import numpy as np
import pytest

from ..eval import benchmark as bm
from ..preprocessing.mp_pose import APP_FRAME_MS, app_rate_indices
from .fixtures import rep_frames

needs_node = pytest.mark.skipif(shutil.which("node") is None, reason="node replays the browser engines")


def ann(**over):
    base = {"clip_id": "s01_squat_normal_01", "subject_id": "s01", "exercise": "squat",
            "human_rep_count": 4, "camera_view": "side", "lighting": "normal", "speed": "normal",
            "conditions": ["normal"], "device_class": "android"}
    base.update(over)
    return base


# ---------------------------------------------------------------- validation
def test_valid_annotation_passes(tmp_path):
    (tmp_path / "s01_squat_normal_01.mp4").write_bytes(b"x")
    assert bm.validate([ann()], tmp_path) == []


@pytest.mark.parametrize("field", bm.REQUIRED)
def test_missing_required_field_is_an_error_not_a_default(tmp_path, field):
    clip = ann()
    clip[field] = None
    errors = bm.validate([clip], tmp_path, need_video=False)
    assert any(field in e for e in errors), errors


@pytest.mark.parametrize("over, fragment", [
    ({"exercise": "burpee"}, "exercise must be"),
    ({"human_rep_count": -1}, "whole number"),
    ({"human_rep_count": 3.5}, "whole number"),
    ({"camera_view": "drone"}, "camera_view"),
    ({"lighting": "dim"}, "lighting"),
    ({"speed": "warp"}, "speed"),
    ({"conditions": ["normal", "sideways"]}, "unknown condition"),
    ({"device_class": "pager"}, "device_class"),
    ({"rep_timestamps": [3.0, 1.0, 2.0, 4.0]}, "in order"),
    ({"rep_timestamps": [1.0, 2.0]}, "rep_timestamps but human_rep_count"),
])
def test_bad_values_are_reported(tmp_path, over, fragment):
    errors = bm.validate([ann(**over)], tmp_path, need_video=False)
    assert any(fragment in e for e in errors), errors


def test_duplicate_clip_ids_and_missing_video(tmp_path):
    errors = bm.validate([ann(), ann()], tmp_path, need_video=True)
    assert any("duplicate" in e for e in errors)
    assert any("video not found" in e for e in errors)


def test_annotations_load_from_jsonl_and_json(tmp_path):
    (tmp_path / "a.jsonl").write_text(json.dumps(ann()) + "\n// comment\n" + json.dumps(ann(clip_id="b")) + "\n",
                                      encoding="utf-8")
    (tmp_path / "a.json").write_text(json.dumps([ann()]), encoding="utf-8")
    assert len(bm.load_annotations(tmp_path / "a.jsonl")) == 2
    assert len(bm.load_annotations(tmp_path / "a.json")) == 1
    assert bm.load_annotations(tmp_path / "missing.jsonl") == []


# ---------------------------------------------------------------- sampling
def test_replay_sampling_matches_the_app():
    """js/pose.js: 60 Hz animation ticks, >= 80 ms since the last run, new frame only."""
    assert APP_FRAME_MS == 80.0
    idx = app_rate_indices(300, fps=30.0)                # ten seconds of 30 fps video
    assert idx == sorted(set(idx))                       # each camera frame at most once, in order
    gaps_ms = np.diff([i * 1000.0 / 30.0 for i in idx])
    assert set(np.round(gaps_ms, 1)) <= {66.7, 100.0}    # newest frame after >= 80 ms of wall time
    assert 110 <= len(idx) <= 130                        # ~12 processed frames per second
    assert app_rate_indices(10, fps=10.0) == list(range(10))   # 100 ms frames: every one is processed
    assert len(app_rate_indices(600, fps=60.0)) <= 130   # a 60 fps camera is still capped by the 80 ms rule


# ---------------------------------------------------------------- metrics
def test_match_and_prf():
    assert bm.match([1.0, 2.1, 5.0], [1.2, 2.0, 3.0]) == (2, 1, 1)
    m = bm.prf(2, 1, 1)
    assert m["precision"] == 0.667 and m["recall"] == 0.667
    assert bm.prf(0, 0, 0)["f1"] is None


def fake_result(reps, seconds, view="side"):
    return {"rules": {"reps": reps, "frames": list(range(len(seconds))), "rep_seconds": seconds,
                      "reasons": {"counting": 10}, "events": {"rep": reps}, "formScore": 90},
            "rule": {"view": view}, "sampled_frames": 100}


def row(clip_id="c1", human=10, before=7, after=9, **over):
    clip = ann(clip_id=clip_id, human_rep_count=human, **over)
    return bm.clip_row(clip, fake_result(before, [float(i) for i in range(before)]),
                       fake_result(after, [float(i) for i in range(after)]), fps=30.0,
                       detected_ratio=0.95, n_frames=300)


def test_clip_row_errors_and_verdict():
    r = row(human=10, before=7, after=9)
    assert (r["before_abs_error"], r["after_abs_error"]) == (3, 1)
    assert (r["before_signed_error"], r["after_signed_error"]) == (-3, -1)
    assert (r["after_missed"], r["after_false_positive"]) == (1, 0)
    assert r["verdict"] == "better"
    over = row(human=5, before=5, after=7)
    assert over["after_false_positive"] == 2 and over["verdict"] == "worse"


def test_timestamps_enable_matched_metrics_and_speed_check():
    clip = ann(human_rep_count=4, rep_timestamps=[1.0, 2.0, 2.4, 4.0])
    r = bm.clip_row(clip, fake_result(4, [1.1, 2.0, 2.5, 4.1]), fake_result(3, [1.0, 2.1, 4.0]),
                    fps=30.0, detected_ratio=1.0, n_frames=150)
    assert r["after_matched"]["tp"] == 3 and r["after_matched"]["fn"] == 1
    assert r["human_fast_reps"] == 1          # the 0.4 s gap between 2.0 and 2.4
    assert "before_matched" in r


def test_aggregate_and_grouping():
    rows = [row("a", 10, 7, 9), row("b", 10, 12, 10, conditions=["fast"]), row("c", 0, 2, 0, conditions=["shallow"])]
    agg = bm.aggregate(rows)
    assert agg["clips"] == 3 and agg["human_reps"] == 20 and agg["usable_clips"] == 3
    assert agg["after"]["mae"] == round((1 + 0 + 0) / 3, 3)
    assert agg["before"]["false_positive"] == 4 and agg["before"]["missed"] == 3
    assert agg["after"]["mean_signed_error"] == round(-1 / 3, 3)
    by_cond = bm.group(rows, lambda r: r["conditions"])
    assert set(by_cond) == {"normal", "fast", "shallow"}
    assert by_cond["shallow"]["before"]["false_positive"] == 2


def test_regression_lists_and_worst_cases():
    rows = [row("better", 10, 6, 10), row("worse", 10, 10, 13), row("same", 10, 9, 9)]
    reg = bm.regression(rows)
    assert reg["better"] == ["better"] and reg["worse"] == ["worse"] and reg["equal"] == ["same"]
    assert reg["after_overcounts"] == ["worse"] and reg["after_undercounts"] == ["same"]
    assert reg["worst_after"][0] == "worse"


def test_camera_guidance_flags_silent_miscounts():
    head_on = row("front", 10, 10, 8, camera_view="front")
    ok = row("side", 10, 10, 10)
    cg = {c["clip_id"]: c for c in bm.camera_guidance([head_on, ok])}
    assert cg["front"]["mismatch"] and cg["front"]["silently_miscounted"]
    assert not cg["side"]["mismatch"]


def test_unusable_clips_do_not_make_a_report_measured():
    r = row()
    r["skeleton_detected"] = 0.1
    report = {"generated_at": "t", "engines": {"before": "b", "after": "a"}, "summary": bm.aggregate([r]),
              "per_exercise": {}, "per_condition": {}, "per_device": {}, "clips": [r],
              "regression": bm.regression([r]), "camera_guidance": [], "failures": [],
              "fast_reps": {"note": "n"}}
    assert "REAL VIDEO: Not measured" in bm.markdown(report)


# ---------------------------------------------------------------- end to end (synthetic landmarks)
@needs_node
def test_run_end_to_end_with_synthetic_landmarks(tmp_path, monkeypatch):
    frames = rep_frames(depth=90.0, frames_per_rep=30, reps=4)   # SYNTHETIC, not a recording
    (tmp_path / "videos").mkdir()
    (tmp_path / "videos" / "syn_squat_01.mp4").write_bytes(b"placeholder")
    (tmp_path / "ann.jsonl").write_text(json.dumps(ann(clip_id="syn_squat_01", human_rep_count=4,
                                                       rep_timestamps=[0.97, 1.97, 2.97, 3.97])) + "\n",
                                        encoding="utf-8")
    monkeypatch.setattr(bm, "extract_cached", lambda *a, **k: (frames, 30.0, 1.0, 1.0))

    class Args:
        annotations = str(tmp_path / "ann.jsonl"); videos_dir = str(tmp_path / "videos")
        cache_dir = str(tmp_path / "cache"); out_dir = str(tmp_path / "reports"); no_cache = False

    assert bm.run(Args) == 0
    report = json.loads(next((tmp_path / "reports").glob("*.json")).read_text(encoding="utf-8"))
    clip = report["clips"][0]
    assert clip["human"] == 4 and clip["before"] >= 0 and clip["after"] >= 0
    assert "after_matched" in clip and report["summary"]["after"]["timed_clips"] == 1
    assert report["per_exercise"]["squat"]["clips"] == 1
    md = next((tmp_path / "reports").glob("*.md")).read_text(encoding="utf-8")
    assert "REAL VIDEO: Measured" in md and "Per clip" in md


def test_run_without_annotations_says_not_measured(tmp_path, capsys):
    class Args:
        annotations = str(tmp_path / "none.jsonl"); videos_dir = str(tmp_path); cache_dir = str(tmp_path)
        out_dir = str(tmp_path); no_cache = False
    assert bm.run(Args) == 2
    assert "Not measured" in capsys.readouterr().out


# ---------------------------------------------------------------- per-rep start/bottom/end
def test_per_rep_start_bottom_end_is_validated(tmp_path):
    good = ann(human_rep_count=2, reps=[{"start": 0.5, "bottom": 1.0, "end": 1.6},
                                         {"start": 1.8, "bottom": 2.2, "end": 2.9}])
    assert bm.validate([good], tmp_path, need_video=False) == []
    for reps, fragment in (
        ([{"start": 1.0, "bottom": 0.5, "end": 1.6}, {"start": 1.8, "end": 2.9}], "start <= bottom <= end"),
        ([{"start": 0.5, "end": 1.6}, {"start": 1.2, "end": 2.9}], "starts before the previous rep ended"),
        ([{"start": 0.5}], "numeric start and end"),
        ([{"start": 0.5, "end": 1.6}], "annotated reps but human_rep_count"),
    ):
        errors = bm.validate([ann(human_rep_count=2, reps=reps)], tmp_path, need_video=False)
        assert any(fragment in e for e in errors), (fragment, errors)
    both = ann(human_rep_count=1, reps=[{"start": 0, "end": 1}], rep_timestamps=[1.0])
    assert any("not both" in e for e in bm.validate([both], tmp_path, need_video=False))


def test_rep_durations_prefer_real_start_end():
    d, src = bm.rep_durations(ann(reps=[{"start": 0.0, "end": 0.7}, {"start": 1.0, "end": 1.55}]))
    assert d == [0.7, 0.55] and src == "start-end"
    d, src = bm.rep_durations(ann(rep_timestamps=[1.0, 1.9, 2.6]))
    assert d == [0.9, 0.7] and src == "gap-between-ends"
    assert bm.rep_durations(ann()) == ([], None)


def test_fast_clip_table_reports_duration_and_all_three_counts():
    clip = ann(clip_id="s01_squat_fast_01", human_rep_count=3, speed="fast", conditions=["fast"],
               reps=[{"start": 0.2, "end": 0.95}, {"start": 1.0, "end": 1.8}, {"start": 1.9, "end": 2.7}])
    r = bm.clip_row(clip, fake_result(3, [0.95, 1.8, 2.7]), fake_result(1, [1.8]), fps=30.0,
                    detected_ratio=1.0, n_frames=90)
    table = bm.fast_clips([r, row("slow_one", 5, 5, 5, speed="slow", conditions=["slow"])])
    assert len(table) == 1
    f = table[0]
    assert f["clip_id"] == "s01_squat_fast_01" and (f["human"], f["previous"], f["current"]) == (3, 3, 1)
    assert f["fastest_rep_s"] == 0.75 and f["duration_source"] == "start-end"
    assert f["current_minus_previous"] == -2


def test_scaffold_leaves_every_observed_value_empty(capsys, tmp_path):
    assert bm.main(["scaffold", "--subject", "s07", "--device", "iphone"]) == 0
    lines = [json.loads(line) for line in capsys.readouterr().out.strip().splitlines()]
    assert len(lines) == 18                                   # 3 exercises x 6 shots
    assert {l["exercise"] for l in lines} == set(bm.PILOTS)
    assert {c for l in lines for c in l["conditions"]} == {"normal", "fast", "slow", "shallow", "frame_edge", "off_angle"}
    for l in lines:
        assert l["human_rep_count"] is None and l["camera_view"] is None and l["lighting"] is None and l["speed"] is None
        assert l["device_class"] == "iphone" and l["subject_id"] == "s07"
    # nothing observed yet → validation must refuse the scaffold as-is
    errors = bm.validate(lines, tmp_path, need_video=False)
    assert any("human_rep_count" in e for e in errors) and any("camera_view" in e for e in errors)
