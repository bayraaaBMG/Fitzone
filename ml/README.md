# MongolFit AI V2 — custom exercise intelligence

Training + export pipeline for the browser form-coach model.

**Status: pipeline only. No trained model ships with this repository, and no
model is loaded in production.** Production model training requires a real
labeled dataset (see `data/README.md`). Everything here runs on synthetic
fixtures so the pipeline can be tested; synthetic fixtures are never a
substitute for measured accuracy.

---

## Where AI V2 sits

Current production path (unchanged, always available):

```
camera → MediaPipe Pose (33 landmarks) → js/pose-rules.js angle rules
       → rep state machine → workout engine
```

AI V2 adds a classifier **beside** that path — it never replaces MediaPipe and
never counts on its own:

```
camera → MediaPipe Pose (33 landmarks)
       → js/ai/ml-features.js   normalize + per-frame feature vector
       → sequence buffer        last N frames
       → custom model           phase / form / mistake / rep-validity
       → js/ai/ai-v2.js         confidence + debounce + veto rules
       → js/pose-rules.js rep state machine   ← still the only thing that counts
       → workout engine
```

The rule engine proposes a rep; AI V2 may **reject** a proposed rep (with a
reason shown to the user) or add coaching text. It can never increment a
counter, so a wrong or missing model can never inflate someone's reps.

Training pipeline:

```
recorded exercise video (local, never committed)
       → MediaPipe pose extraction      preprocessing/extract_poses.py
       → normalization + features       preprocessing/pose_features.py, normalize.py
       → windowed sequences             preprocessing/sequence.py
       → PyTorch training               training/train.py      (split BY PERSON)
       → evaluation                     training/evaluate.py   (metrics + confusion matrix)
       → ONNX export + parity gate      export/export_model.py
       → TensorFlow.js or ONNX Runtime Web model + metadata.json
       → browser inference              js/ai/ml-runtime.js
```

## Framework roles

| Framework | Role | Why |
|---|---|---|
| **MediaPipe Pose** | The only landmark detector, in training and in the browser | Already shipping and working; re-learning landmarks from raw pixels would need orders of magnitude more data and a far bigger model. Also keeps training features identical to inference features. |
| **PyTorch** | Trains the temporal classifier (`training/`) | Sequence models, class weighting, per-person splits and reproducible seeds are straightforward; training happens offline on a workstation, never in production. |
| **TensorFlow.js** | Browser runtime when the converted graph passes the numeric parity gate | Mature WebGL backend on mobile browsers, and a `tfjs` GraphModel loads from a plain static file without extra WASM assets. |
| **ONNX Runtime Web** | Browser runtime when TF.js conversion fails the gate, or when the converters are unavailable | A GRU export can convert badly; forcing it would silently change predictions. ORT Web runs the exported ONNX graph directly. |

`export/export_model.py` decides which of the two is used **by measurement**,
not by preference: it compares converted-model outputs against PyTorch on
fixture inputs and records the winner in `metadata.json`. The browser reads
that field and lazily loads only the matching runtime. If neither passes,
nothing is published and AI V2 stays off.

**Measured so far** (2026-09-20, on synthetic fixtures — no real model exists):

- PyTorch → ONNX → ONNX Runtime: max |diff| **1.8e-07** against PyTorch, well
  inside the 1e-04 tolerance. This is the path a first model would ship on.
- PyTorch → ONNX → TensorFlow.js: **not measured.** The converter chain
  (`tensorflow` + `onnx2tf` + `tensorflowjs`) could not be installed in the
  development environment used here, so `try_tfjs()` reported the tools as
  missing and the export fell back to ONNX, exactly as designed. Nothing was
  published, and no TF.js claim is made.
- The browser side of *both* runtimes is covered by tests with stub runtimes
  (model discovery, tensor shape `[1, T, F]`, output parsing, tensor disposal,
  refusals, timeouts, dead-session fallback), so whichever the gate picks, the
  loading and inference glue is already exercised.

When a dataset exists, run the export on a machine where those converters
install; if TF.js passes the gate it becomes the shipped runtime with no code
change, because the browser follows `metadata.runtime`.

## Feature specification v1 (`featureVersion: 1`)

Python (`preprocessing/pose_features.py`) and JavaScript
(`js/ai/ml-features.js`) must produce the same vectors; the parity test
(`tests/test_js_parity.py`) fails the build if they drift. Agreement is
measured, not assumed: landmark and shape channels within 1e-5, motion
channels within 1e-4 (they divide by dt, which amplifies float32 round-off by
up to ~33x). Measured on the current code: 2.0e-5 worst case.

Per frame, from 33 MediaPipe landmarks `(x, y, z, visibility)`:

1. **Validity.** A point is valid when `visibility >= 0.3`, its coordinates are
   finite, and it lies within `[-0.05, 1.05]` of the image (same out-of-frame
   margin the rule engine uses). Invalid points become `(0, 0, 0)` with
   `visibility = 0`.
2. **Aspect correction.** `x` and `z` are multiplied by `width/height` so angles
   are true angles rather than image-stretched ones.
3. **Centering.** The pelvis (midpoint of hips 23/24) becomes the origin.
4. **Scaling.** Divide by the torso length (pelvis → shoulder midpoint). If that
   is below `1e-3` (person not detected, or folded), the frame is marked
   invalid and contributes a zero vector with `valid = False`.
5. **No rotation normalization** — orientation carries real form information
   (e.g. a leaning torso). Left/right is handled by horizontal-flip
   augmentation at training time, not by rewriting the skeleton.

Vector layout — **158 floats**:

| Index | Count | Contents |
|---|---|---|
| 0–131 | 132 | 33 landmarks × (x, y, z, visibility), normalized as above |
| 132–143 | 12 | Shape channels in [0,1]: ten angles ÷ 180 (elbow L/R, shoulder L/R, hip L/R, knee L/R, torso lean, torso tilt) then shoulder-width and hip-width ÷ torso, halved. `-1` when the joints needed are not visible |
| 144–157 | 14 | Velocities: the 12 angle deltas per second ÷ 180 (clamped ±10) and pelvis dx, dy per second (clamped ±5) |

Velocities use `dt = clamp(ts - prev_ts, 1 ms, 250 ms)`; the first frame of a
sequence has zero velocity. This makes the features frame-rate independent,
which matters because the browser loop runs at ~12.5 fps while training video
is usually 30 fps.

## Sequence windows

Temporal context is the point of AI V2 — a single frame cannot tell a paused
bottom position from a rep. Defaults (`training/config.py`):

| Exercise | Window | Notes |
|---|---|---|
| squat | 45 frames | ~3.6 s at browser rate |
| pushup | 45 frames | |
| lunge | 60 frames | slower, alternating legs |

Training windows use hop 5; browser inference keeps a ring buffer and runs at
most every 4th frame (~3 Hz) to protect frame rate.

## Model heads

One shared GRU trunk (hidden 64, 1 layer, ~60k parameters) with four heads:

- `phase` — start, descending, bottom, ascending, complete
- `form` — correct / incorrect
- `mistake` — per-exercise list from `data/README.md` (includes `none`)
- `rep_valid` — whether the window ends a complete, valid repetition

Small on purpose: the target is a mid-range phone, not a GPU.

## Layout

```
ml/
  README.md              this file
  requirements.txt       training-time dependencies (never shipped to browsers)
  data/README.md         dataset specification, annotation format, collection plan
  preprocessing/         extract_poses.py, pose_features.py, normalize.py, sequence.py
  training/              config.py, dataset.py, model.py, train.py, evaluate.py
  models/README.md       model versioning + metadata schema
  export/export_model.py ONNX export, TF.js conversion, parity gate, metadata
  tests/                 pytest suite (runs on synthetic fixtures)
```

## Running

A published model is picked up only when it is listed in the web-root
manifest `models/index.json` (`{"squat": "squat-v1"}`). Until that file exists,
the browser never requests anything and the rule engine runs alone.

```bash
pip install -r requirements.txt          # torch, numpy; mediapipe only for extraction
python -m ml.training.train --exercise squat --data ml/data/processed/squat
python -m ml.training.evaluate --exercise squat --checkpoint ml/models/squat-v1/model.pt
python -m ml.export.export_model --checkpoint ml/models/squat-v1/model.pt --out models/squat-v1
pytest ml/tests -q
```

Tests run without a dataset and without torch installed (model tests skip
themselves); the feature, sequence and parity tests always run.
