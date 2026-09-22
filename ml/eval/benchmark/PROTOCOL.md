# First real camera test — recording protocol

Purpose: find out whether the rep engine behaves on real people the way the
synthetic tests suggest, and where it does not. **3–5 people.** This is a
debugging set, not an accuracy study — no percentage will be quoted from it.

## Setup (every clip)

- Phone on a **stable** stand or propped up — never hand-held.
- About **1 m high**, **2–3 m away**, whole body in the picture with a little
  space above the head and below the feet.
- **Side on or 45°** to the person, unless the shot says otherwise.
- Normal room light, light source **not** behind the person.
- Landscape or portrait both work; keep the same for a person's whole set.
- Record 1080p or 720p at the phone's normal frame rate. Do not use slow-motion
  or filters.
- 8–12 reps per clip. Start recording, wait 2 s standing still, exercise,
  wait 2 s, stop. (The still start matters: the app calibrates on it.)

## Shot list per person — 18 clips

| # | clip name (`<subject>_<exercise>_<shot>_01`) | what to do |
|---|---|---|
| 1 | `normal` | normal pace, full reps |
| 2 | `fast` | as fast as that person would really train, full reps, **no pause at the top** |
| 3 | `slow` | 3–4 s per rep |
| 4 | `shallow` | half-depth reps on purpose — a coach would count **0** |
| 5 | `edge` | stand so the body is close to one edge of the picture (still fully inside) |
| 6 | `angle` | camera about 30° away from the recommended view (towards head-on) |

…for each of **squat**, **pushup** and **lunge** → 3 × 6 = 18 clips per person.

Name the files exactly like the scaffold expects, e.g. `s01_squat_fast_01.mp4`,
and copy them to `ml/eval/benchmark/videos/`. Subject ids are `s01`, `s02`, …
— never names.

Write down, per person: which phone was used (iPhone / Android / other), and
anything unusual (loose clothing, second person in the room, dim evening light).

## Consent and privacy

- Ask each person before recording; note the date they agreed.
- Videos stay on this computer (`ml/eval/benchmark/videos/` is git-ignored).
  Do not upload them to Firebase, Vercel, chat apps or cloud folders.
- Delete the videos when the analysis is done if the person asks.

## Annotate

```bash
python -m ml.eval.benchmark scaffold --subject s01 --device android >> ml/eval/benchmark/annotations.jsonl
```

This writes the 18 planned lines with every **observed** value empty. For each
clip, watch the video and fill in:

- `human_rep_count` — reps a careful coach would credit as complete
  (shallow clip: usually 0)
- `camera_view` — `side`, `45`, `front`, `back`, `other` (what was actually filmed)
- `lighting` — `normal`, `low`, `bright`
- `speed` — `normal`, `fast`, `slow`, `mixed`
- `conditions` — pre-filled from the shot list; correct it if the clip differs
- `reps` (strongly recommended for the `fast` and `normal` clips): one entry per
  counted rep, in seconds from the start of the video

```json
"reps": [{"start": 2.1, "bottom": 2.6, "end": 3.2}, {"start": 3.3, "bottom": 3.8, "end": 4.4}]
```

  `start` = leaves the top, `bottom` = deepest point, `end` = back at the top.
  A video player that shows milliseconds (VLC: *Tools → Media Information*, or
  frame-stepping with `e`) makes this quick. Without `reps` the report still
  works, but rep speed and precision/recall cannot be measured.

Never guess a value. If you cannot tell whether a rep counts, leave it out and
write why in `notes`.

## Run

```bash
python -m ml.eval.benchmark validate     # fix every reported problem first
python -m ml.eval.benchmark run
```

The report lands in `ml/eval/benchmark/reports/`. Read, in this order:

1. **Per clip** — Human / Previous / Current for every clip.
2. **Fast reps** — rep duration, human, previous and current for every fast
   clip. This answers whether real users hit the ~0.8 s squat weakness the
   synthetic tests predicted.
3. **Regression check** — clips where the current engine is worse, over- or
   under-counts, and the worst failures.
4. **Failed clips — engine trace** — for each wrong clip: state, angle,
   direction, range, joint visibility, calibration, depth check and the reason
   each movement was or was not counted.
5. **Per exercise / condition / device / view** — MAE and the direction of the
   errors.

Only after reading those: propose the smallest possible change, and record it
in [`../THRESHOLD_LOG.md`](../THRESHOLD_LOG.md) with the evidence clip IDs
before touching `js/pose-rules.js`.

## After this test

When the engine is stable on these 3–5 people, collect **20 or more** subjects
(different ages, body sizes, clothing, phones and rooms) for a broader
evaluation. Only that larger, held-out set can support a real-world accuracy
figure.
