"""Dataset statistics + the checks that stop a bad split reaching training."""
from __future__ import annotations

import json

import numpy as np

from ..tools.dataset_report import main
from .fixtures import synthetic_clip, synthetic_dataset


def test_no_dataset_says_what_is_missing(tmp_path, capsys):
    code = main(["--exercise", "squat", "--data", str(tmp_path / "nothing")])
    out = capsys.readouterr().out
    assert code == 2
    assert "Real labeled dataset is required before training and publication" in out


def test_reports_subjects_classes_and_split(tmp_path, capsys):
    data_dir = synthetic_dataset(tmp_path, subjects=("p1", "p2", "p3", "p4", "p5"))
    out_path = tmp_path / "report.json"
    code = main(["--exercise", "squat", "--data", str(data_dir), "--out", str(out_path)])
    text = capsys.readouterr().out
    assert code == 0
    assert "subjects        5" in text and "clips           10" in text
    assert "phase" in text and "mistake" in text

    report = json.loads(out_path.read_text(encoding="utf-8"))
    assert report["subjects"] == ["p1", "p2", "p3", "p4", "p5"]
    assert report["windows"] > 0 and report["frames"] > 0
    splits = report["split"]
    assert not (set(splits["train"]) & set(splits["test"]))
    assert not (set(splits["train"]) & set(splits["val"]))
    assert sum(len(v) for v in splits.values()) == 5
    assert report["problems"] == []
    # a five-person set cannot support an accuracy claim, and the report says so
    assert any("not enough to claim real-world accuracy" in w for w in report["warnings"])


def test_one_subject_is_reported_as_blocking(tmp_path, capsys):
    data_dir = tmp_path / "squat"
    data_dir.mkdir(parents=True)
    np.savez_compressed(data_dir / "p1_a.npz", **synthetic_clip("p1"))
    code = main(["--exercise", "squat", "--data", str(data_dir)])
    out = capsys.readouterr().out
    assert code == 1
    assert "per-person split needs at least 3" in out


def test_clips_with_a_rarely_detected_skeleton_are_flagged(tmp_path, capsys):
    data_dir = synthetic_dataset(tmp_path, subjects=("p1", "p2", "p3"))
    bad = synthetic_clip("p4")
    bad["valid"] = np.zeros(len(bad["valid"]), dtype=bool)
    bad["valid"][:5] = True
    np.savez_compressed(data_dir / "p4_bad.npz", **bad)
    out_path = tmp_path / "report.json"
    main(["--exercise", "squat", "--data", str(data_dir), "--out", str(out_path)])
    report = json.loads(out_path.read_text(encoding="utf-8"))
    assert any("skeleton found in" in w for w in report["warnings"])
    assert any(c["clip"] == "p4_bad" and c["usable_ratio"] < 0.5 for c in report["per_clip"])
