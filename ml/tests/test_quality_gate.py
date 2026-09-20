"""The publish gate: it must refuse by default and only pass on measured evidence."""
from __future__ import annotations

import json

from ..training.quality_gate import evaluate, main

GOOD_METRICS = {
    "form": {"macro_f1": 0.81}, "mistake": {"macro_f1": 0.74},
    "_meta": {"subjects": ["s21", "s22", "s23"], "subjects_train": ["s01", "s02"],
              "known_failures": ["loose clothing hides the knee line"]},
}
GOOD_REP = {"summary": {"rules": {"false_positive": 4, "missed": 3},
                        "ai": {"false_positive": 2, "missed": 3}},
            "coach_confidence_median": 0.82}
GOOD_DATASET = {"split": {"train": ["s01", "s02"], "val": ["s11"], "test": ["s21", "s22", "s23"]}}
GOOD_PARITY = {"onnxMaxAbsDiff": 1.8e-07, "outputsFinite": True,
               "browserRuntimeChecked": True, "browserRuntimeNote": "loaded in chromium"}
THRESHOLDS = dict(min_test_subjects=3, min_form_f1=0.7, min_mistake_f1=0.6, min_coach_confidence=0.75)


def run(metrics=GOOD_METRICS, rep=GOOD_REP, dataset=GOOD_DATASET, parity=GOOD_PARITY, **over):
    args = {**THRESHOLDS, **over}
    return evaluate("squat", metrics, rep, dataset, parity, **args)


def failed(conditions):
    return [c["condition"] for c in conditions if not c["pass"]]


def test_everything_measured_and_above_the_chosen_thresholds_passes():
    assert not failed(run())


def test_no_inputs_fails_every_evidence_condition():
    conditions = run(metrics=None, rep=None, dataset=None, parity=None)
    assert len(failed(conditions)) == len(conditions)


def test_thresholds_must_be_chosen_by_a_person():
    conditions = run(min_form_f1=None, min_mistake_f1=None, min_coach_confidence=None)
    names = failed(conditions)
    assert any("form macro-F1 threshold" in n for n in names)
    assert any("mistake macro-F1 threshold" in n for n in names)
    assert any("coaching confidence threshold" in n for n in names)


def test_subject_leakage_between_splits_fails():
    leaky = {"split": {"train": ["s01", "s21"], "val": ["s11"], "test": ["s21", "s22", "s23"]}}
    assert any("two splits" in n for n in failed(run(dataset=leaky)))


def test_test_subject_seen_in_training_fails():
    metrics = {**GOOD_METRICS, "_meta": {**GOOD_METRICS["_meta"], "subjects_train": ["s01", "s21"]}}
    assert any("unseen during training" in n for n in failed(run(metrics=metrics)))


def test_ai_adding_false_positive_reps_fails():
    rep = {**GOOD_REP, "summary": {"rules": {"false_positive": 2, "missed": 3},
                                   "ai": {"false_positive": 5, "missed": 3}}}
    assert any("false-positive reps" in n for n in failed(run(rep=rep)))


def test_ai_vetoing_real_reps_fails():
    rep = {**GOOD_REP, "summary": {"rules": {"false_positive": 2, "missed": 1},
                                   "ai": {"false_positive": 1, "missed": 6}}}
    assert any("vetoes reps" in n or "veto reps" in n for n in failed(run(rep=rep)))


def test_missing_rep_comparison_fails_rather_than_passing_silently():
    assert any("false-positive reps" in n for n in failed(run(rep=None)))


def test_export_parity_and_finite_outputs_are_required():
    assert any("ONNX export" in n for n in failed(run(parity={**GOOD_PARITY, "onnxMaxAbsDiff": 0.5})))
    assert any("finite" in n for n in failed(run(parity={**GOOD_PARITY, "outputsFinite": False})))
    assert any("browser runtime" in n for n in failed(run(parity={**GOOD_PARITY, "browserRuntimeChecked": False})))


def test_too_few_test_subjects_fails():
    metrics = {**GOOD_METRICS, "_meta": {**GOOD_METRICS["_meta"], "subjects": ["s21"]}}
    assert any("test subjects" in n for n in failed(run(metrics=metrics)))


def test_undocumented_failure_cases_fail():
    metrics = {**GOOD_METRICS, "_meta": {**GOOD_METRICS["_meta"], "known_failures": []}}
    assert any("failure cases" in n for n in failed(run(metrics=metrics)))


def test_cli_returns_nonzero_and_writes_a_report(tmp_path, capsys):
    paths = {}
    for name, data in (("metrics", GOOD_METRICS), ("rep", GOOD_REP), ("dataset", GOOD_DATASET), ("parity", GOOD_PARITY)):
        p = tmp_path / f"{name}.json"
        p.write_text(json.dumps(data), encoding="utf-8")
        paths[name] = str(p)
    out = tmp_path / "gate.json"
    code = main(["--exercise", "squat", "--metrics", paths["metrics"], "--rep-report", paths["rep"],
                 "--dataset-report", paths["dataset"], "--parity", paths["parity"], "--out", str(out)])
    assert code == 1  # thresholds not chosen yet
    report = json.loads(out.read_text(encoding="utf-8"))
    assert report["passed"] is False and report["conditions"]
    assert "do not publish" in capsys.readouterr().out.lower()

    code = main(["--exercise", "squat", "--metrics", paths["metrics"], "--rep-report", paths["rep"],
                 "--dataset-report", paths["dataset"], "--parity", paths["parity"],
                 "--min-form-f1", "0.7", "--min-mistake-f1", "0.6", "--min-coach-confidence", "0.75",
                 "--out", str(out)])
    assert code == 0
    assert json.loads(out.read_text(encoding="utf-8"))["passed"] is True
