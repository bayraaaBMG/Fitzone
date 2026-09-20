"""Evaluate a checkpoint on the held-out subjects.

    python -m ml.training.evaluate --exercise squat --checkpoint ml/models/squat-v1/model.pt --data ml/data/processed/squat

Writes metrics.json next to the checkpoint. export_model.py copies those numbers
into the published metadata — nothing else is allowed to write metrics, so a
model can never ship with invented accuracy.

The metric helpers are plain numpy so they can be unit-tested without torch.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from .config import MISTAKES, PHASES, FORMS, REP_VALID
from .dataset import build_dataset, HEADS


def confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> np.ndarray:
    cm = np.zeros((n_classes, n_classes), dtype=np.int64)
    for t, p in zip(y_true.astype(int), y_pred.astype(int)):
        cm[t, p] += 1
    return cm


def prf_per_class(cm: np.ndarray):
    """(precision, recall, f1) per class; 0 where a class was never seen."""
    tp = np.diag(cm).astype(np.float64)
    pred = cm.sum(axis=0).astype(np.float64)
    true = cm.sum(axis=1).astype(np.float64)
    precision = np.divide(tp, pred, out=np.zeros_like(tp), where=pred > 0)
    recall = np.divide(tp, true, out=np.zeros_like(tp), where=true > 0)
    denom = precision + recall
    f1 = np.divide(2 * precision * recall, denom, out=np.zeros_like(tp), where=denom > 0)
    return precision, recall, f1


def head_metrics(y_true: np.ndarray, y_pred: np.ndarray, classes) -> dict:
    cm = confusion_matrix(y_true, y_pred, len(classes))
    precision, recall, f1 = prf_per_class(cm)
    support = cm.sum(axis=1)
    return {
        "accuracy": float(np.diag(cm).sum() / max(1, cm.sum())),
        "macro_f1": float(np.mean(f1)),
        "weighted_f1": float(np.sum(f1 * support) / max(1, support.sum())),
        "per_class": {
            str(c): {"precision": float(precision[i]), "recall": float(recall[i]),
                     "f1": float(f1[i]), "support": int(support[i])}
            for i, c in enumerate(classes)
        },
        "confusion_matrix": cm.tolist(),
        "classes": list(classes),
    }


def classes_for(exercise: str) -> dict:
    return {"phase": PHASES, "form": FORMS, "mistake": MISTAKES[exercise], "rep_valid": REP_VALID}


def predict(model, x: np.ndarray, batch_size: int = 128) -> dict:
    import torch
    outs: dict[str, list] = {}
    model.eval()
    with torch.no_grad():
        for i in range(0, len(x), batch_size):
            logits = model(torch.from_numpy(x[i:i + batch_size]))
            for head, value in logits.items():
                outs.setdefault(head, []).append(value.argmax(1).numpy())
    return {h: np.concatenate(v) if v else np.zeros(0, np.int64) for h, v in outs.items()}


def evaluate_split(model, split: dict, exercise: str) -> dict:
    classes = classes_for(exercise)
    preds = predict(model, split["x"])
    out = {h: head_metrics(split["y"][h], preds[h], classes[h]) for h in HEADS if h in split["y"] and h in preds}
    out["_meta"] = {"windows": int(len(split["x"])), "subjects": sorted(set(split["subjects"]))}
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Evaluate an AI V2 checkpoint on held-out people")
    ap.add_argument("--exercise", required=True, choices=sorted(MISTAKES))
    ap.add_argument("--checkpoint", required=True)
    ap.add_argument("--data", required=True)
    ap.add_argument("--split", default="test", choices=["val", "test"])
    args = ap.parse_args(argv)

    from .model import load_checkpoint
    model, ckpt = load_checkpoint(args.checkpoint)
    cfg = ckpt["config"]
    data = build_dataset(args.data, cfg["sequence_length"], cfg["hop"], cfg["val_subjects"],
                         cfg["test_subjects"], cfg["seed"], flip_augment=False)
    split = data[args.split]
    if not len(split["x"]):
        print(f"the {args.split} split is empty — more subjects are needed before any metric means anything")
        return 2

    metrics = evaluate_split(model, split, args.exercise)
    metrics["_meta"].update({
        "split": args.split,
        "exercise": args.exercise,
        "checkpoint": str(args.checkpoint),
        "dataset_version": ckpt.get("dataset_version", "unversioned"),
        "subjects_train": ckpt.get("class_report", {}).get("train", {}).get("subjects", []),
    })
    out_path = Path(args.checkpoint).with_name("metrics.json")
    out_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    for head in [h for h in HEADS if h in metrics]:
        m = metrics[head]
        print(f"{head:10s} acc {m['accuracy']:.3f}  macro-F1 {m['macro_f1']:.3f}")
    print(f"subjects: {metrics['_meta']['subjects']}  windows: {metrics['_meta']['windows']}")
    print(f"wrote {out_path}")
    if len(metrics["_meta"]["subjects"]) < 5:
        print("WARNING: too few held-out people to claim real-world accuracy. Report these numbers as preliminary.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
