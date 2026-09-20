"""Train one pilot exercise model.

    python -m ml.training.train --exercise squat --data ml/data/processed/squat

Requires a real processed dataset; it will not invent one. Every run writes the
class balance report, the per-epoch history and the exact config next to the
checkpoint, so a model can always be traced back to what produced it.
"""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader, TensorDataset

from .config import TrainConfig, MISTAKES
from .dataset import build_dataset, class_report, save_report, HEADS
from .model import ExerciseNet, count_parameters


def set_seed(seed: int) -> None:
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


def make_loader(split: dict, heads, batch_size: int, shuffle: bool) -> DataLoader:
    x = torch.from_numpy(split["x"])
    ys = [torch.from_numpy(split["y"][h]) for h in heads]
    return DataLoader(TensorDataset(x, *ys), batch_size=batch_size, shuffle=shuffle, drop_last=False)


def class_weights(labels: np.ndarray, n_classes: int) -> torch.Tensor:
    """Inverse-frequency weights: mistakes are rarer than correct reps."""
    counts = np.bincount(labels, minlength=n_classes).astype(np.float64)
    counts[counts == 0] = 1.0
    w = counts.sum() / (n_classes * counts)
    return torch.tensor(w, dtype=torch.float32)


def run_epoch(model, loader, heads, losses, weights, optimizer=None):
    train = optimizer is not None
    model.train(train)
    total, seen, correct = 0.0, 0, {h: 0 for h in heads}
    for batch in loader:
        x, targets = batch[0], batch[1:]
        with torch.set_grad_enabled(train):
            logits = model(x)
            loss = sum(weights.get(h, 1.0) * losses[h](logits[h], t) for h, t in zip(heads, targets))
            if train:
                optimizer.zero_grad(); loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
                optimizer.step()
        total += float(loss) * len(x); seen += len(x)
        for h, t in zip(heads, targets):
            correct[h] += int((logits[h].argmax(1) == t).sum())
    return total / max(1, seen), {h: correct[h] / max(1, seen) for h in heads}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Train an AI V2 pilot model")
    ap.add_argument("--exercise", required=True, choices=sorted(MISTAKES))
    ap.add_argument("--data", required=True, help="directory of processed .npz clips")
    ap.add_argument("--out", default=None, help="checkpoint directory (default ml/models/<exercise>-v1)")
    ap.add_argument("--epochs", type=int); ap.add_argument("--batch-size", type=int, dest="batch_size")
    ap.add_argument("--lr", type=float); ap.add_argument("--seed", type=int)
    ap.add_argument("--dataset-version", default="unversioned")
    args = ap.parse_args(argv)

    cfg = TrainConfig.for_exercise(args.exercise, epochs=args.epochs, batch_size=args.batch_size,
                                   lr=args.lr, seed=args.seed)
    set_seed(cfg.seed)
    out_dir = Path(args.out or f"ml/models/{cfg.exercise}-v1")
    out_dir.mkdir(parents=True, exist_ok=True)

    data = build_dataset(args.data, cfg.sequence_length, cfg.hop, cfg.val_subjects, cfg.test_subjects,
                         cfg.seed, cfg.flip_augment)
    report = class_report(data)
    save_report(report, out_dir / "class_report.json")
    print(json.dumps(report, indent=2))
    if not len(data["train"]["x"]) or not len(data["val"]["x"]):
        print("Not enough data to train: every split needs windows from different people.")
        return 2

    heads = [h for h in HEADS if h in data["train"]["y"]]
    model = ExerciseNet(cfg.feature_size, {h: cfg.head_sizes[h] for h in heads}, cfg.hidden, cfg.layers, cfg.dropout)
    print(f"{cfg.exercise}: {count_parameters(model)} parameters, heads={heads}")

    losses = {h: torch.nn.CrossEntropyLoss(weight=class_weights(data["train"]["y"][h], cfg.head_sizes[h])) for h in heads}
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
    train_loader = make_loader(data["train"], heads, cfg.batch_size, True)
    val_loader = make_loader(data["val"], heads, cfg.batch_size, False)

    best, best_epoch, history = float("inf"), -1, []
    for epoch in range(cfg.epochs):
        tr_loss, tr_acc = run_epoch(model, train_loader, heads, losses, cfg.head_weights, optimizer)
        va_loss, va_acc = run_epoch(model, val_loader, heads, losses, cfg.head_weights)
        history.append({"epoch": epoch, "train_loss": tr_loss, "val_loss": va_loss,
                        "train_acc": tr_acc, "val_acc": va_acc})
        print(f"epoch {epoch:3d}  train {tr_loss:.4f}  val {va_loss:.4f}  " +
              "  ".join(f"{h} {va_acc[h]:.3f}" for h in heads))
        if va_loss < best - 1e-4:
            best, best_epoch = va_loss, epoch
            torch.save({"state_dict": model.state_dict(), "config": cfg.to_dict(), "head_sizes": {h: cfg.head_sizes[h] for h in heads},
                        "heads": heads, "epoch": epoch, "val_loss": va_loss,
                        "dataset_version": args.dataset_version, "class_report": report},
                       out_dir / "model.pt")
        elif epoch - best_epoch >= cfg.patience:
            print(f"early stop at epoch {epoch} (best {best_epoch})")
            break

    (out_dir / "history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    print(f"best epoch {best_epoch}, val loss {best:.4f} -> {out_dir/'model.pt'}")
    print("Next: python -m ml.training.evaluate --exercise", cfg.exercise, "--checkpoint", out_dir / "model.pt",
          "--data", args.data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
