# Dataset specification

**There is no dataset in this repository, and none of it is downloaded
automatically.** No public video was scraped and relabelled as a "MongolFit
dataset". Until a real labeled dataset exists, AI V2 has no trained model and
stays off in production.

Raw video never enters git. `ml/data/raw/` and `ml/data/processed/` are
git-ignored; keep them on the machine doing the training.

## Layout

```
ml/data/
  raw/                        local only, never committed
    squat/
      correct/                p001_squat_correct_01.mp4
      shallow/
      knee_inward/
      forward_lean/
      incomplete_rep/
    pushup/
      correct/  shallow/  hips_down/  hips_up/  incomplete_rep/
    lunge/
      correct/  knee_inward/  short_range/  unstable/
  processed/                  local only — extracted landmarks + features
    squat/p001_squat_correct_01.npz
  annotations/
    squat.jsonl               one JSON object per clip (committed once real)
```

Class lists per pilot exercise (`mistake` head):

| Exercise | Classes |
|---|---|
| squat | `none`, `shallow`, `knee_inward`, `forward_lean`, `incomplete_rep` |
| pushup | `none`, `shallow`, `hips_down`, `hips_up`, `incomplete_rep` |
| lunge | `none`, `knee_inward`, `short_range`, `unstable` |

## Annotation format

One JSON object per clip, JSON Lines. Frame indices refer to the **source
video**, not to extracted windows.

```json
{
  "clip_id": "p001_squat_correct_01",
  "exercise": "squat",
  "subject_id": "p001",
  "fps": 30,
  "view": "side",
  "mistake": "none",
  "reps": [
    {"start": 12, "bottom": 34, "end": 57, "valid": true, "mistake": "none"},
    {"start": 58, "bottom": 80, "end": 104, "valid": false, "mistake": "shallow"}
  ],
  "notes": "tripod at 2 m, indoor light",
  "consent": "recorded-with-consent-2026-09-20"
}
```

Frames between reps are labelled `start`. Phase labels are derived from each
rep's boundaries: `start → descending → bottom → ascending → complete`.

`subject_id` is mandatory: the train/validation/test split is **by person**
(`training/dataset.py`). Splitting randomly by frame leaks the same person into
training and test and produces meaningless accuracy.

## Labeling policy

Label only what is clearly visible. Guessing produces a model that has learned
someone's guesses.

- **Uncertain rep boundary** (the person pauses, the start is ambiguous): label
  the boundary you are confident about and leave the rest out of `reps`.
- **Uncertain mistake** (could be `shallow`, could be `forward_lean`): do not
  pick one. Drop the clip from the mistake head by labelling the rep
  `"mistake": "none", "valid": false` only if it is genuinely an incomplete rep;
  otherwise exclude the clip entirely and record why in `notes`.
- **Two mistakes at once**: label the dominant one and mention the other in
  `notes`. If neither dominates, exclude.
- **Skeleton rarely detected** (person cut off, very dark, two people in view):
  exclude the clip. `ml.tools.dataset_report` flags clips whose skeleton was
  found in under 50% of frames.
- **Excluded clips** stay on disk with an `exclude: true` field and a reason, so
  the same clip is not re-labelled differently later.

Two people should label a sample of the same clips; if their rep counts differ
by more than one on a clip, the protocol needs tightening before collecting
more.

## Subject IDs and splits

`subject_id` is an opaque label (`s01`, `s02`, …) with no name, contact detail
or anything identifying. Keep the mapping from a real person to an id out of
this repository, or do not keep it at all.

The split is computed from the ids (`ml/training/dataset.py`), is deterministic
for a given seed, and is printed by:

```bash
python -m ml.tools.dataset_report --exercise squat --data ml/data/processed/squat --out dataset_report.json
```

Record the resulting subject ids per split in the model's `metadata.json`
(the export copies them from the evaluation), so any published number can be
traced to the people it was measured on.

## What to collect

For each pilot exercise, per subject:

- correct repetitions at a comfortable pace, and deliberately slow ones
- each mistake class from the table above, performed on purpose
- incomplete / partial repetitions, and pauses mid-rep
- at least two camera angles (side and 3/4), tripod height ~1 m
- different distances (1.5 m and 3 m)
- different clothing (loose and fitted — loose clothing is a known weak point)
- different lighting (daylight, indoor evening)
- left- and right-facing for asymmetric movements
- different backgrounds (plain wall, furnished room, gym)

Also record a few clips per subject specifically for the stress test (Phase 9):
low light, camera far (3 m) and close (1.5 m), a slight angle change, the body
near the frame edge, and a brief partial occlusion.

Useful minimum before claiming anything about accuracy: **≥ 20 subjects**, with
test subjects never seen in training. Fewer subjects can prove the pipeline
runs; it cannot measure accuracy.

## Privacy

- Record only with explicit, documented consent, and store the consent date in
  the annotation.
- Keep raw video local. Do not upload it to production Firebase or any other
  app backend.
- Prefer sharing extracted landmarks (`.npz`) over video — they carry the
  movement without the person's face or room.
- The production app never uploads camera frames: pose runs on-device, and
  nothing about the video leaves the browser. Any future data collection must
  be a separate, opt-in process outside the workout camera flow.
- Do not store names, contact details or anything identifying beyond an opaque
  `subject_id`.
