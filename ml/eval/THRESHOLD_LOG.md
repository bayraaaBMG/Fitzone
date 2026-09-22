# Rep-engine threshold changes

Every change to a value in `js/pose-rules.js` (`POSE_DEFAULTS` or a rule's
`th`) is recorded here **with the real-video evidence that justified it**.
Synthetic tests alone are not a reason to change a threshold.

| date | exercise | parameter | old | new | reason | clips / subjects measured | MAE before → after | FP before → after | missed before → after | worse clips |
|---|---|---|---|---|---|---|---|---|---|---|

No entries yet — no real recordings have been measured. The values in
`js/pose-rules.js` at commit `eca45d6` are the starting baseline, chosen from
movement mechanics, not tuned on data.

How to add an entry:

1. Run `python -m ml.eval.benchmark run` on the current engine and keep the report.
2. Change **one** parameter for **one** exercise.
3. Re-run on the same clips and a held-out set of subjects.
4. Record both runs here, including every clip that got worse.
5. Keep the change only if false positives did not increase and no meaningful
   condition got worse.
