"""Model, training step and ONNX export. Skipped when torch is absent."""
from __future__ import annotations

import numpy as np
import pytest

torch = pytest.importorskip("torch", reason="training-time dependency; see ml/requirements.txt")

from ..preprocessing.pose_features import FEATURE_SIZE  # noqa: E402
from ..training.config import TrainConfig  # noqa: E402
from ..training.dataset import build_dataset, HEADS  # noqa: E402
from ..training.model import ExerciseNet, count_parameters, load_checkpoint  # noqa: E402
from ..training.train import class_weights, make_loader, run_epoch, set_seed  # noqa: E402
from .fixtures import synthetic_dataset  # noqa: E402

CFG = TrainConfig.for_exercise("squat")
HEAD_SIZES = CFG.head_sizes


def build_model():
    return ExerciseNet(FEATURE_SIZE, HEAD_SIZES, hidden=32, layers=1, dropout=0.1)


def test_forward_shapes():
    model = build_model()
    out = model(torch.zeros(4, 20, FEATURE_SIZE))
    assert set(out) == set(HEAD_SIZES)
    for head, size in HEAD_SIZES.items():
        assert out[head].shape == (4, size)


def test_model_stays_small_enough_for_a_phone():
    assert count_parameters(ExerciseNet(FEATURE_SIZE, HEAD_SIZES)) < 200_000


def test_only_the_last_frame_decides():
    """The window's final frame is the decision frame; earlier frames inform it."""
    torch.manual_seed(0)
    model = build_model().eval()
    x = torch.randn(1, 12, FEATURE_SIZE)
    # a constant offset would be cancelled by the input LayerNorm, so perturb the
    # frame's shape rather than shifting every channel by the same amount
    noise = torch.randn(FEATURE_SIZE) * 2.0
    with torch.no_grad():
        base = model(x)["form"]
        last = x.clone(); last[0, -1] += noise
        first = x.clone(); first[0, 0] += noise
        d_last = float((model(last)["form"] - base).abs().max())
        d_first = float((model(first)["form"] - base).abs().max())
    assert d_last > 1e-4, "the decision frame barely moved the output"
    assert d_first > 0.0, "earlier frames carry no temporal context at all"
    assert d_last > d_first, f"the last frame should dominate ({d_last} vs {d_first})"


def test_class_weights_favour_rare_classes():
    w = class_weights(np.array([0, 0, 0, 0, 1]), 2)
    assert w[1] > w[0]


def test_training_step_reduces_loss(tmp_path):
    set_seed(0)
    data = build_dataset(synthetic_dataset(tmp_path), length=20, hop=10, val_ratio=0.25,
                         test_ratio=0.25, seed=3, flip_augment=True)
    heads = [h for h in HEADS if h in data["train"]["y"]]
    model = build_model()
    losses = {h: torch.nn.CrossEntropyLoss(weight=class_weights(data["train"]["y"][h], HEAD_SIZES[h])) for h in heads}
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3)
    loader = make_loader(data["train"], heads, batch_size=16, shuffle=True)
    first, _ = run_epoch(model, loader, heads, losses, CFG.head_weights, optimizer)
    for _ in range(4):
        last, _ = run_epoch(model, loader, heads, losses, CFG.head_weights, optimizer)
    assert last < first  # the loop learns *something* on synthetic data — not an accuracy claim


def test_checkpoint_round_trip(tmp_path):
    model = build_model()
    path = tmp_path / "model.pt"
    torch.save({"state_dict": model.state_dict(), "config": {**CFG.to_dict(), "hidden": 32, "dropout": 0.1},
                "head_sizes": HEAD_SIZES, "heads": list(HEAD_SIZES)}, path)
    loaded, ckpt = load_checkpoint(path)
    x = torch.randn(2, 15, FEATURE_SIZE)
    with torch.no_grad():
        assert torch.allclose(model.eval()(x)["phase"], loaded(x)["phase"], atol=1e-6)
    assert ckpt["config"]["feature_size"] == FEATURE_SIZE


def test_onnx_export_matches_pytorch(tmp_path):
    pytest.importorskip("onnx")
    pytest.importorskip("onnxruntime")
    from ..export.export_model import PARITY_TOLERANCE, _fixture_inputs, export_onnx, onnx_parity

    model = build_model().eval()
    heads = list(HEAD_SIZES)
    path = export_onnx(model, length=20, features=FEATURE_SIZE, heads=heads, out_path=tmp_path / "model.onnx")
    assert path.exists()
    diff = onnx_parity(path, model, _fixture_inputs(4, 20, FEATURE_SIZE), heads)
    assert diff <= PARITY_TOLERANCE, f"ONNX export drifted from PyTorch by {diff}"


def test_export_refuses_when_parity_fails(tmp_path, monkeypatch):
    """The gate, not preference, decides what ships."""
    pytest.importorskip("onnx")
    pytest.importorskip("onnxruntime")
    from ..export import export_model as em

    model = build_model().eval()
    heads = list(HEAD_SIZES)
    path = em.export_onnx(model, length=20, features=FEATURE_SIZE, heads=heads, out_path=tmp_path / "model.onnx")
    monkeypatch.setattr(em, "torch_outputs", lambda *a, **k: np.full((4, sum(HEAD_SIZES.values())), 99.0, np.float32))
    assert em.onnx_parity(path, model, em._fixture_inputs(4, 20, FEATURE_SIZE), heads) > em.PARITY_TOLERANCE
