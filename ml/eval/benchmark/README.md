# Real-video rep benchmark

Compares, on your own recordings:

| column | what it is |
|---|---|
| **Human** | the reps a person counted while watching the clip |
| **Before** | the engine before the counting fix (`ml/eval/baseline/pose-rules-v1.js`) |
| **After** | the engine production runs now (`js/pose-rules.js`) |

Both engines are the real browser code, replayed over the same landmarks,
extracted with the **same MediaPipe model file the app downloads** and sampled
at the **app's rate (one frame per 80 ms, ~12.5 fps)** — so the numbers
describe what users actually get.

Nothing here leaves the machine. Videos, the landmark cache, the model file and
the reports live in git-ignored folders; nothing is sent to Firebase, Vercel
or anywhere else.

## 1. Record

Put clips in `ml/eval/benchmark/videos/` named `<clip_id>.mp4` (any format
OpenCV reads: mp4, mov, webm, avi).

For each pilot exercise (squat, pushup, lunge), per person, aim for:

| condition | how to record it |
|---|---|
| `normal` | normal pace, normal light, recommended camera position |
| `fast` | as fast as the person would really train |
| `slow` | 3–4 s per rep |
| `shallow` | deliberately incomplete reps (a person would not credit them) |
| `pause` | stop 2–3 s at the top between reps |
| `off_angle` | camera head-on, or behind, instead of the recommended view |
| `frame_edge` | body close to the edge of the picture |
| `low_light` | evening room light, no lamp towards the person |
| `occlusion` | something briefly passes in front (a hand, a chair, another person walking by) |

Recommended camera position (what the app asks for):

- **squat, push-up:** side on or 45°, whole body in frame, phone ~1 m high, 2–3 m away
- **lunge:** side on or 45°, both legs visible

Record which phone or camera was used (`device_class`). Without that, no
device claim can be made.

## 2. Annotate

One JSON object per line in `ml/eval/benchmark/annotations.jsonl`.
`python -m ml.eval.benchmark template` prints an empty line to copy.

```json
{"clip_id": "s01_squat_normal_01", "subject_id": "s01", "exercise": "squat",
 "human_rep_count": 20, "rep_timestamps": null,
 "camera_view": "side", "lighting": "normal", "speed": "normal",
 "conditions": ["normal"], "device_class": "android", "form_label": null, "notes": ""}
```

The values above are an **example of the format**, not data.

| field | required | meaning |
|---|---|---|
| `clip_id` | yes | unique; the video is `videos/<clip_id>.*` (or set `"video"` to a path) |
| `subject_id` | yes | opaque id such as `s01` — no names, nothing identifying |
| `exercise` | yes | `squat` · `pushup` · `lunge` |
| `human_rep_count` | yes | reps a careful person **credits as complete**. A deliberately shallow clip is usually `0` |
| `rep_timestamps` | no | seconds at the **end** of each counted rep (back at the top). Enables precision / recall / F1 and the rep-speed check. Must have exactly `human_rep_count` entries |
| `camera_view` | yes | `side` · `45` · `front` · `back` · `other` |
| `lighting` | yes | `normal` · `low` · `bright` |
| `speed` | yes | `normal` · `fast` · `slow` · `mixed` |
| `conditions` | no | any of the conditions in the table above |
| `device_class` | no | `iphone` · `android` · `webcam` · `other` · `unknown` |
| `form_label` | no | reported next to the engine's form score, **not scored** (see below) |
| `notes` | no | free text |

Rules:

- Never fill a value you did not observe. A missing required field makes the
  benchmark refuse to run rather than guess.
- If you cannot decide whether a rep counts, leave it out of the count and
  say so in `notes`.
- Count from the video, not from memory of the session.

Check before running:

```bash
python -m ml.eval.benchmark validate
```

## 3. Run

```bash
python -m ml.eval.benchmark run
```

First run downloads the model (~6 MB, the same file as the app) and extracts
landmarks once per clip into `cache/`; later runs reuse them, so re-running
after an engine change takes seconds.

Output: a table in the terminal and `reports/report-<time>.{md,json}` with

- per clip: Human, Before, After, missed, false positives, absolute and
  signed error, better / worse / equal
- overall, per exercise, per condition, per device, per camera view:
  MAE, mean signed error (+ = overcounts), missed, false positives
- precision / recall / F1 when `rep_timestamps` exist (0.75 s matching window)
- regression lists: where After is better, worse, over-counts, under-counts,
  and the worst clips
- camera guidance: recommended vs actual view, how much of the clip the app
  refused as a wrong angle, and whether it **silently miscounted** instead
- rep speed: how many annotated reps were faster than 0.6 s
- for every clip where After is wrong: the engine trace (state, angle,
  direction, range, visibility of the needed joints, calibration, depth gate,
  and the reason each movement was or was not counted)

"REAL VIDEO: Measured" is only printed when at least one clip had a person
detected in at least half its frames.

## 4. Count accuracy vs form

The benchmark scores **counting only**. Form feedback is a separate question: a
clip can be counted exactly while the coaching is poor. The engine's form score
and warnings are listed per clip, and `form_label` is shown beside them, but no
form accuracy is computed until there are form labels **and** an agreed,
validated mapping from engine warnings to those labels.

## 5. Changing thresholds

Only after real measurements, one exercise at a time, and every change goes in
[`../THRESHOLD_LOG.md`](../THRESHOLD_LOG.md) with the old value, new value,
reason, exercise and the measured before/after on the same clips. Re-run the
full benchmark after each change — a fix for one condition must not quietly
break another. Do not tune on the clips you then report as the result; keep a
held-out set of subjects.

### Fast reps — check this first

Synthetic sweeps run at the app's real sampling rate (~12 processed frames per
second, see `ml/preprocessing/mp_pose.py`) show:

| pace (continuous, no pause) | squat old → new | push-up | lunge |
|---|---|---|---|
| ~2.0 s / rep | 6 → 6 | 6 → 6 | 6 → 6 |
| ~1.2 s / rep | 5 → 5 | 5 → 6 | 5 → 6 |
| ~0.8 s / rep | 5 → **3** | 5 → 5 | 5 → 5 |
| ≤ 0.66 s / rep | 0 → 0 | 0 → 0 | 0 → 0 |

(6 reps expected in each case. With a ¼ s pause at the top, both engines
count all 6 down to ~0.8 s.)

So the realistic risk is **continuous squats at ~0.8 s per rep**, where the
current engine is stricter than the old one, and both engines stop counting
below ~0.7 s. (An earlier report quoted "0.6 s"; that sweep ran at 25 fps,
faster than the app actually samples.) These are synthetic numbers: they say
where to look, not what users experience.

This is **not** loosened by default. Record `fast` squats, annotate
`rep_timestamps`, run the benchmark and read "Reps faster than 0.6 s" and the
per-condition table. Only if real users perform valid reps that fast should
adaptive timing be investigated — not a lower safety threshold.
