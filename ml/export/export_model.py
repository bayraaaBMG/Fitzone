"""Export a checkpoint to a browser-loadable model + metadata.

    python -m ml.export.export_model --checkpoint ml/models/squat-v1/model.pt --out models/squat-v1

Pipeline:

    PyTorch checkpoint
      -> ONNX (opset 17)                      always
      -> ONNX Runtime parity check            always, this is the reference
      -> TensorFlow.js conversion             attempted when the tools exist
      -> TF.js parity check (node)            decides which runtime ships
      -> metadata.json                        records the winner and the numbers

The runtime is chosen by measurement, never by preference: TF.js is published
only when its converted graph reproduces PyTorch's outputs within tolerance.
A GRU can convert badly and still "work", quietly giving different predictions;
publishing that would be worse than shipping nothing.

Metrics are copied from metrics.json (written by training/evaluate.py) or left
null. This script never invents a number.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

PARITY_TOLERANCE = 1e-4
PARITY_SAMPLES = 8


def _fixture_inputs(n: int, length: int, features: int, seed: int = 20260920) -> np.ndarray:
    """Plausible feature-shaped noise. Only exercises the graph, never a metric."""
    rng = np.random.default_rng(seed)
    x = rng.normal(0.0, 0.6, size=(n, length, features)).astype(np.float32)
    x[:, :, 132:144] = rng.uniform(0.0, 1.0, size=(n, length, 12))       # shape channels
    x[:, :, 144:] = rng.normal(0.0, 1.0, size=(n, length, 14))           # motion channels
    return x


def export_onnx(model, length: int, features: int, heads, out_path: Path) -> Path:
    import torch
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dummy = torch.from_numpy(_fixture_inputs(1, length, features))

    class Wrapped(torch.nn.Module):
        """Tuple outputs in a fixed order — ONNX has no dict outputs."""
        def __init__(self, inner, heads):
            super().__init__()
            self.inner = inner
            self.heads = list(heads)

        def forward(self, x):
            out = self.inner(x)
            return tuple(out[h] for h in self.heads)

    kwargs = dict(
        input_names=["sequence"], output_names=list(heads),
        dynamic_axes={"sequence": {0: "batch"}, **{h: {0: "batch"} for h in heads}},
        opset_version=17, do_constant_folding=True,
    )
    wrapped = Wrapped(model, heads).eval()
    try:
        # the TorchScript exporter handles GRUs and needs no extra packages;
        # torch 2.x defaults to the dynamo exporter, which requires onnxscript
        torch.onnx.export(wrapped, (dummy,), str(out_path), dynamo=False, **kwargs)
    except TypeError:
        torch.onnx.export(wrapped, (dummy,), str(out_path), **kwargs)  # torch < 2.5
    return out_path


def torch_outputs(model, x: np.ndarray, heads) -> np.ndarray:
    import torch
    with torch.no_grad():
        out = model(torch.from_numpy(x))
    return np.concatenate([out[h].numpy() for h in heads], axis=1)


def onnx_parity(onnx_path: Path, model, x: np.ndarray, heads):
    import onnxruntime as ort
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    got = sess.run(None, {"sequence": x})
    got = np.concatenate([np.asarray(g) for g in got], axis=1)
    return float(np.max(np.abs(got - torch_outputs(model, x, heads))))


def onnx_to_saved_model(onnx_path: Path, saved: Path):
    """ONNX -> TensorFlow SavedModel. Returns (ok, note).

    onnx2tf is tried first (maintained, handles recurrent ops by decomposing
    them); onnx-tf is the fallback for environments that still have it.
    """
    if shutil.which("onnx2tf") or _module_exists("onnx2tf"):
        cmd = ([shutil.which("onnx2tf")] if shutil.which("onnx2tf") else [sys.executable, "-m", "onnx2tf"])
        proc = subprocess.run(cmd + ["-i", str(onnx_path), "-o", str(saved), "-osd", "-n"],
                              capture_output=True, text=True, timeout=1800)
        if proc.returncode == 0 and saved.exists():
            return True, "onnx2tf"
        note = (proc.stderr or proc.stdout).strip().splitlines()
        return False, f"onnx2tf failed: {' '.join(note[-3:])[:300]}"
    try:
        import onnx as onnx_mod
        from onnx_tf.backend import prepare
    except ImportError as exc:
        return False, f"no ONNX->TF converter installed ({exc}); pip install onnx2tf tensorflow tensorflowjs"
    try:
        prepare(onnx_mod.load(str(onnx_path))).export_graph(str(saved))
        return True, "onnx-tf"
    except Exception as exc:  # recurrent ops are the usual failure
        return False, f"onnx-tf raised {type(exc).__name__}: {exc}"


def _module_exists(name: str) -> bool:
    import importlib.util
    return importlib.util.find_spec(name) is not None


def try_tfjs(onnx_path: Path, out_dir: Path, x: np.ndarray, reference: np.ndarray, heads):
    """ONNX -> TensorFlow SavedModel -> TF.js, then compare against PyTorch.

    Returns (ok, max_abs_diff, note). Missing converters are a normal outcome:
    they are optional dependencies, and the ONNX path still ships.
    """
    if shutil.which("tensorflowjs_converter") is None:
        return False, None, "tensorflowjs_converter not installed (pip install tensorflowjs onnx2tf tensorflow)"

    with tempfile.TemporaryDirectory() as tmp:
        saved = Path(tmp) / "saved_model"
        converted, note = onnx_to_saved_model(onnx_path, saved)
        if not converted:
            return False, None, note
        proc = subprocess.run(
            ["tensorflowjs_converter", "--input_format=tf_saved_model",
             "--output_format=tfjs_graph_model", "--signature_name=serving_default",
             "--saved_model_tags=serve", str(saved), str(out_dir)],
            capture_output=True, text=True, timeout=900,
        )
        if proc.returncode != 0:
            return False, None, f"tensorflowjs_converter failed ({note}): {proc.stderr.strip()[:300]}"

    parity_script = Path(__file__).with_name("tfjs_parity.mjs")
    probe = subprocess.run([shutil.which("node") or "node", str(parity_script), str(out_dir)],
                           input=json.dumps({"x": x.tolist(), "heads": list(heads)}),
                           capture_output=True, text=True, timeout=900)
    if probe.returncode != 0:
        return False, None, f"tfjs parity probe failed: {(probe.stderr or probe.stdout).strip()[:300]}"
    got = np.asarray(json.loads(probe.stdout)["outputs"], dtype=np.float32)
    diff = float(np.max(np.abs(got - reference)))
    return diff <= PARITY_TOLERANCE, diff, "tfjs parity measured"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Export an AI V2 model for the browser")
    ap.add_argument("--checkpoint", required=True)
    ap.add_argument("--out", required=True, help="published directory, e.g. models/squat-v1")
    ap.add_argument("--dataset-version", default=None)
    ap.add_argument("--force-runtime", choices=["onnx", "tfjs"], default=None,
                    help="skip the measured choice (only for debugging a conversion)")
    ap.add_argument("--gate", default=None,
                    help="gate.json from ml.training.quality_gate; without a passing gate the model "
                         "files and parity report are written but no metadata.json, so nothing loads")
    args = ap.parse_args(argv)

    from ..training.model import load_checkpoint
    from ..training.config import MISTAKES, PHASES, FORMS, REP_VALID

    ckpt_path = Path(args.checkpoint)
    model, ckpt = load_checkpoint(ckpt_path)
    cfg = ckpt["config"]
    heads = ckpt.get("heads") or list(ckpt["head_sizes"])
    exercise, length, features = cfg["exercise"], cfg["sequence_length"], cfg["feature_size"]
    out_dir = Path(args.out); out_dir.mkdir(parents=True, exist_ok=True)

    x = _fixture_inputs(PARITY_SAMPLES, length, features)
    reference = torch_outputs(model, x, heads)

    onnx_path = export_onnx(model, length, features, heads, out_dir / "model.onnx")
    onnx_diff = onnx_parity(onnx_path, model, x, heads)
    print(f"ONNX export: max |diff| vs PyTorch = {onnx_diff:.3e} (tolerance {PARITY_TOLERANCE:.0e})")
    if onnx_diff > PARITY_TOLERANCE:
        print("ONNX export does not reproduce PyTorch outputs — refusing to publish.")
        return 2

    tfjs_ok, tfjs_diff, note = try_tfjs(onnx_path, out_dir / "tfjs", x, reference, heads)
    print(f"TensorFlow.js: {note}" + (f", max |diff| = {tfjs_diff:.3e}" if tfjs_diff is not None else ""))

    runtime = args.force_runtime or ("tfjs" if tfjs_ok else "onnx")
    if runtime == "tfjs":
        for item in (out_dir / "tfjs").iterdir():
            shutil.move(str(item), out_dir / item.name)
        shutil.rmtree(out_dir / "tfjs", ignore_errors=True)
        files = sorted(p.name for p in out_dir.iterdir() if p.suffix in (".json", ".bin") and p.name != "metadata.json")
    else:
        shutil.rmtree(out_dir / "tfjs", ignore_errors=True)
        files = ["model.onnx"]

    parity_report = {
        "onnxMaxAbsDiff": onnx_diff, "tfjsMaxAbsDiff": tfjs_diff, "tolerance": PARITY_TOLERANCE,
        "runtime": runtime, "note": note,
        "outputsFinite": bool(np.isfinite(reference).all()),
        "browserRuntimeChecked": False,
        "browserRuntimeNote": "set by the browser test once it has loaded this model",
    }
    (out_dir / "parity.json").write_text(json.dumps(parity_report, indent=2), encoding="utf-8")
    print(f"wrote {out_dir/'parity.json'} (feed it to ml.training.quality_gate)")

    gate = json.loads(Path(args.gate).read_text(encoding="utf-8")) if args.gate and Path(args.gate).exists() else None
    if not (gate and gate.get("passed")):
        print("\nQuality gate not passed (or not supplied): metadata.json was NOT written, so the app "
              "cannot load this model. Run ml.eval.rep_compare, ml.tools.dataset_report and "
              "ml.training.quality_gate, then re-run this command with --gate.")
        return 1

    metrics_path = ckpt_path.with_name("metrics.json")
    metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else None
    if metrics is None:
        print("No metrics.json next to the checkpoint: publishing with null metrics. "
              "Run ml.training.evaluate on held-out people before claiming anything about accuracy.")

    metadata = {
        "version": out_dir.name,
        "exercise": exercise,
        "featureVersion": cfg["feature_version"],
        "featureSize": features,
        "sequenceLength": length,
        "modelType": f"gru{cfg['hidden']}",
        "runtime": runtime,
        "files": files,
        "outputs": list(heads),
        "classes": {"phase": list(PHASES), "form": list(FORMS),
                    "mistake": list(MISTAKES[exercise]), "rep_valid": list(REP_VALID)},
        "trainedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "datasetVersion": args.dataset_version or ckpt.get("dataset_version", "unversioned"),
        "parity": parity_report,
        "metrics": metrics,
        "gate": {"passed": True, "conditions": [c["condition"] for c in gate.get("conditions", []) if c.get("pass")]},
        "testSubjects": ((metrics or {}).get("_meta", {}) or {}).get("subjects", []),
        "limitations": ["single person in frame", "side or 3/4 view",
                        "trained on the dataset named above only"],
    }
    (out_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"published {runtime} model -> {out_dir}")
    print("Add it to models/index.json to let the app pick it up; the app stays on the rule "
          "engine until that entry exists.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
