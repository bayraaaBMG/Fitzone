"""The temporal classifier: one small GRU trunk, four heads.

Kept small on purpose (~60k parameters at hidden=64): it has to load and run
inside a phone browser next to MediaPipe, and a GRU of this size exports
cleanly to both ONNX and TensorFlow.js.
"""
from __future__ import annotations

import torch
import torch.nn as nn


class ExerciseNet(nn.Module):
    def __init__(self, feature_size: int, head_sizes: dict, hidden: int = 64, layers: int = 1, dropout: float = 0.2):
        super().__init__()
        self.feature_size = feature_size
        self.hidden = hidden
        self.norm = nn.LayerNorm(feature_size)
        self.gru = nn.GRU(feature_size, hidden, num_layers=layers, batch_first=True,
                          dropout=dropout if layers > 1 else 0.0)
        self.drop = nn.Dropout(dropout)
        self.heads = nn.ModuleDict({name: nn.Linear(hidden, size) for name, size in head_sizes.items()})

    def forward(self, x):                       # x: (B, T, F)
        out, _ = self.gru(self.norm(x))
        last = self.drop(out[:, -1])            # the window's decision frame
        return {name: head(last) for name, head in self.heads.items()}


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def load_checkpoint(path, map_location="cpu"):
    """Returns (model, checkpoint dict) for evaluation/export."""
    ckpt = torch.load(path, map_location=map_location, weights_only=False)
    model = ExerciseNet(
        feature_size=ckpt["config"]["feature_size"],
        head_sizes=ckpt["head_sizes"],
        hidden=ckpt["config"]["hidden"],
        layers=ckpt["config"]["layers"],
        dropout=ckpt["config"]["dropout"],
    )
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    return model, ckpt
