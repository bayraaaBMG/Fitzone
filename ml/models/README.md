# Model versioning

Checkpoints live here during training (`ml/models/<exercise>-v<n>/model.pt`) and
are **not committed**. Only the exported browser bundle is published, under the
web root:

```
models/<exercise>-v<n>/
  metadata.json
  model.json + group1-shard1of1.bin     (runtime "tfjs")
  model.onnx                            (runtime "onnx")
```

The app finds models through a manifest at the web root:

```json
// models/index.json
{"squat": "squat-v1", "pushup": "pushup-v1"}
```

Nothing in `models/` exists yet — no model has been trained, and there is no
manifest. The browser treats a missing manifest or `metadata.json` as "AI V2
unavailable" and silently uses the existing rule engine; the lookup happens
once per page load, only after the camera has been turned on.

## metadata.json

Written by `ml/export/export_model.py`; the browser refuses a model whose
`featureVersion` its feature extractor does not implement, so an old cached
bundle can never be fed mismatched features.

```json
{
  "version": "squat-v1",
  "exercise": "squat",
  "featureVersion": 1,
  "featureSize": 158,
  "sequenceLength": 45,
  "modelType": "gru64",
  "runtime": "tfjs",
  "files": ["model.json", "group1-shard1of1.bin"],
  "outputs": ["phase", "form", "mistake", "rep_valid"],
  "classes": {
    "phase": ["start", "descending", "bottom", "ascending", "complete"],
    "form": ["correct", "incorrect"],
    "mistake": ["none", "shallow", "knee_inward", "forward_lean", "incomplete_rep"],
    "rep_valid": ["no", "yes"]
  },
  "trainedAt": "2026-10-01T00:00:00Z",
  "datasetVersion": "squat-2026-10",
  "parity": {"backend": "tfjs", "maxAbsDiff": 3.1e-06, "tolerance": 1e-04},
  "metrics": {
    "subjects": {"train": 0, "val": 0, "test": 0},
    "windows": {"train": 0, "val": 0, "test": 0},
    "phase": {"accuracy": null, "macro_f1": null},
    "form": {"accuracy": null, "precision": null, "recall": null, "f1": null},
    "mistake": {"macro_f1": null},
    "rep_valid": {"precision": null, "recall": null}
  },
  "limitations": [
    "single person in frame",
    "side or 3/4 view",
    "not measured on real-world data yet"
  ]
}
```

`metrics` values stay `null` until a real evaluation run fills them. The export
script refuses to invent numbers, and the app never displays accuracy figures.
