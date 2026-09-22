# Rep-engine threshold changes

Every change to a value in `js/pose-rules.js` (`POSE_DEFAULTS` or a rule's
`th`) is recorded here **with the real-video evidence that justified it**.
Synthetic fixtures are never a reason to change a threshold.

| date | exercise | parameter | old value | new value | reason | evidence clip IDs | before result | after result |
|---|---|---|---|---|---|---|---|---|

No entries — no real recordings have been measured yet. The values in
`js/pose-rules.js` at commit `eca45d6` are the starting baseline, chosen from
movement mechanics, not tuned on data.

Before adding an entry:

1. Run `python -m ml.eval.benchmark run` on the current engine and keep the report.
2. Propose the **smallest** change that addresses a failure seen in real clips:
   one parameter, one exercise.
3. Re-run on the same clips **and** on subjects the change was not designed on.
4. Fill every column. *before result* / *after result* are the measured
   Human / Current counts, MAE, missed and false positives on the evidence
   clips, plus any clip that got worse anywhere in the benchmark.
5. Keep the change only if false positives did not increase and no meaningful
   condition got worse.
