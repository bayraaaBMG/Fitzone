"""Evaluation metrics (numpy only — no torch needed)."""
from __future__ import annotations

import numpy as np

from ..training.evaluate import confusion_matrix, head_metrics, prf_per_class


def test_confusion_matrix_counts_rows_as_truth():
    cm = confusion_matrix(np.array([0, 0, 1, 1]), np.array([0, 1, 1, 1]), 2)
    assert cm.tolist() == [[1, 1], [0, 2]]


def test_perfect_prediction_scores_one():
    y = np.array([0, 1, 2, 1])
    m = head_metrics(y, y, ["a", "b", "c"])
    assert m["accuracy"] == 1.0 and m["macro_f1"] == 1.0


def test_precision_recall_differ_when_they_should():
    # every sample predicted "b": perfect recall for b, poor precision
    y_true = np.array([0, 1, 1, 0])
    y_pred = np.array([1, 1, 1, 1])
    p, r, f1 = prf_per_class(confusion_matrix(y_true, y_pred, 2))
    assert r[1] == 1.0 and p[1] == 0.5 and 0.6 < f1[1] < 0.7
    assert p[0] == 0.0 and r[0] == 0.0


def test_absent_class_does_not_blow_up():
    m = head_metrics(np.array([0, 0]), np.array([0, 0]), ["a", "b"])
    assert m["per_class"]["b"]["support"] == 0 and m["per_class"]["b"]["f1"] == 0.0
    assert 0.0 <= m["macro_f1"] <= 1.0


def test_metrics_report_support_and_classes():
    m = head_metrics(np.array([0, 1, 1]), np.array([0, 1, 0]), ["none", "shallow"])
    assert m["classes"] == ["none", "shallow"]
    assert m["per_class"]["shallow"]["support"] == 2
    assert m["confusion_matrix"] == [[1, 0], [1, 1]]
    assert m["weighted_f1"] <= 1.0
