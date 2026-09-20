"""Temporal windows.

Training uses fixed-length windows cut with a hop; the browser keeps the same
window in a ring buffer (js/ai/ml-features.js MlSequenceBuffer). A window is
labelled by its LAST frame, which is the frame the browser is deciding about.
"""
from __future__ import annotations

import numpy as np

from .pose_features import FEATURE_SIZE


def windows(features: np.ndarray, length: int, hop: int = 5, valid: np.ndarray | None = None,
            min_valid_ratio: float = 0.8):
    """Yields (start_index, window (length, FEATURE_SIZE)).

    Windows whose frames are mostly invalid (person out of frame, occluded) are
    dropped: they would teach the model that "no person" looks like a rep.
    """
    if features.ndim != 2 or features.shape[1] != FEATURE_SIZE:
        raise ValueError(f"expected (N, {FEATURE_SIZE}), got {features.shape}")
    if length <= 0 or hop <= 0:
        raise ValueError("length and hop must be positive")
    n = features.shape[0]
    for start in range(0, max(0, n - length + 1), hop):
        end = start + length
        if valid is not None and float(np.mean(valid[start:end])) < min_valid_ratio:
            continue
        yield start, features[start:end]


def pad_window(window: np.ndarray, length: int) -> np.ndarray:
    """Left-pads a short window by repeating its first frame (browser warm-up)."""
    if window.shape[0] >= length:
        return window[-length:]
    head = np.repeat(window[:1], length - window.shape[0], axis=0)
    return np.concatenate([head, window], axis=0)


class SequenceBuffer:
    """Streaming ring buffer, the Python twin of the browser's buffer."""

    def __init__(self, length: int):
        self.length = int(length)
        self._buf: list[np.ndarray] = []
        self.filled = 0

    def reset(self) -> None:
        self._buf.clear()
        self.filled = 0

    def push(self, vec: np.ndarray, valid: bool = True) -> None:
        if not valid:
            # a gap invalidates temporal context; start collecting again
            self.reset()
            return
        self._buf.append(np.asarray(vec, dtype=np.float32))
        if len(self._buf) > self.length:
            del self._buf[0]
        self.filled = len(self._buf)

    @property
    def ready(self) -> bool:
        return self.filled >= self.length

    def window(self) -> np.ndarray | None:
        if not self._buf:
            return None
        return pad_window(np.stack(self._buf), self.length)
