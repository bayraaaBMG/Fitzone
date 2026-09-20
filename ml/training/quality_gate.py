"""Phase 11: the gate a model must pass before it may be published.

    python -m ml.training.quality_gate --exercise squat \
        --metrics ml/models/squat-v1/metrics.json \
        --rep-report ml/models/squat-v1/rep_report.json \
        --dataset-report ml/models/squat-v1/dataset_report.json \
        --out ml/models/squat-v1/gate.json

Every condition is checked against numbers that were measured elsewhere; this
script computes none of them and invents none of them. A missing input is a
failed condition, not a pass.

Thresholds: the ones that are absolute come from what the app promises
(unseen test subjects, no leakage, finite outputs, export parity). The rep
condition is *relative to the measured rule-engine baseline* — AI V2 may not
make rep counting worse — because there is no honest absolute number to pick
before seeing a baseline. `--min-*` flags exist for thresholds a human decides
after reading the baseline; they default to off rather than to an invented value.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .config import MISTAKES

ONNX_PARITY_TOLERANCE = 1e-4


def load(path, label):
    if not path:
        return None, f"{label}: not supplied"
    p = Path(path)
    if not p.exists():
        return None, f"{label}: {path} does not exist"
    try:
        return json.loads(p.read_text(encoding="utf-8")), None
    except json.JSONDecodeError as exc:
        return None, f"{label}: unreadable ({exc})"


def check(conditions, name, ok, detail=""):
    conditions.append({"condition": name, "pass": bool(ok), "detail": detail})


def evaluate(exercise, metrics, rep_report, dataset_report, parity, min_test_subjects,
             min_form_f1=None, min_mistake_f1=None, min_coach_confidence=None):
    c = []

    # 1-2. held-out people, no leakage
    test_subjects = (metrics or {}).get("_meta", {}).get("subjects", []) or []
    train_subjects = (metrics or {}).get("_meta", {}).get("subjects_train", []) or []
    overlap = sorted(set(test_subjects) & set(train_subjects))
    check(c, "test subjects were unseen during training",
          bool(test_subjects) and not overlap,
          f"test={test_subjects or 'missing'} overlap={overlap or 'none'}")
    split = (dataset_report or {}).get("split") or {}
    leak = sorted((set(split.get("train", [])) & set(split.get("test", []))) |
                  (set(split.get("train", [])) & set(split.get("val", []))) |
                  (set(split.get("val", [])) & set(split.get("test", []))))
    check(c, "no subject appears in two splits", bool(split) and not leak, f"overlap={leak or 'none'}")
    check(c, f"at least {min_test_subjects} test subjects",
          len(test_subjects) >= min_test_subjects, f"{len(test_subjects)} test subjects")

    # 3-4. export is faithful and the outputs are usable
    onnx_diff = (parity or {}).get("onnxMaxAbsDiff")
    check(c, "ONNX export reproduces PyTorch within tolerance",
          isinstance(onnx_diff, (int, float)) and onnx_diff <= ONNX_PARITY_TOLERANCE,
          f"max |diff| = {onnx_diff} (tolerance {ONNX_PARITY_TOLERANCE})")
    check(c, "model outputs are finite", bool((parity or {}).get("outputsFinite")),
          "measured during export" if parity else "not supplied")
    check(c, "browser runtime ran the exported model",
          bool((parity or {}).get("browserRuntimeChecked")),
          (parity or {}).get("browserRuntimeNote", "not supplied"))

    # 5. rep counting must not get worse (the whole point of the rep engine)
    summary = (rep_report or {}).get("summary") or {}
    rules, ai = summary.get("rules"), summary.get("ai")
    if rules and ai:
        worse_fp = ai["false_positive"] > rules["false_positive"]
        worse_missed = ai["missed"] > rules["missed"]
        check(c, "AI V2 does not add false-positive reps vs the rule engine",
              not worse_fp, f"rules FP={rules['false_positive']} ai FP={ai['false_positive']}")
        check(c, "AI V2 does not veto reps a person counted",
              not worse_missed, f"rules missed={rules['missed']} ai missed={ai['missed']}")
    else:
        check(c, "AI V2 does not add false-positive reps vs the rule engine", False,
              "rep comparison missing — run ml.eval.rep_compare on the test subjects")
        check(c, "AI V2 does not veto reps a person counted", False, "rep comparison missing")

    # 6. classification quality, only against thresholds a human chose
    for head, floor in (("form", min_form_f1), ("mistake", min_mistake_f1)):
        head_metrics = (metrics or {}).get(head) or {}
        f1 = head_metrics.get("macro_f1")
        if floor is None:
            check(c, f"{head} macro-F1 threshold set by a human after reading the baseline", False,
                  f"measured macro-F1 = {f1 if f1 is not None else 'missing'}; pass --min-{head}-f1 to decide")
        else:
            check(c, f"{head} macro-F1 >= {floor}", isinstance(f1, (int, float)) and f1 >= floor,
                  f"measured {f1}")

    # 7. coaching that is mostly low-confidence is noise
    if min_coach_confidence is None:
        check(c, "coaching confidence threshold reviewed", False,
              "pass --min-coach-confidence after reading the measured confidence distribution")
    else:
        measured = (rep_report or {}).get("coach_confidence_median")
        check(c, f"median coaching confidence >= {min_coach_confidence}",
              isinstance(measured, (int, float)) and measured >= min_coach_confidence,
              f"measured {measured}")

    # 8. known failures written down
    failures = (metrics or {}).get("_meta", {}).get("known_failures") or (rep_report or {}).get("known_failures")
    check(c, "known failure cases documented", bool(failures),
          f"{len(failures)} documented" if failures else "none recorded — run the stress test (Phase 9)")
    return c


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Decide whether a trained model may be published")
    ap.add_argument("--exercise", required=True, choices=sorted(MISTAKES))
    ap.add_argument("--metrics", default=None, help="metrics.json from ml.training.evaluate")
    ap.add_argument("--rep-report", default=None, help="JSON from ml.eval.rep_compare")
    ap.add_argument("--dataset-report", default=None, help="JSON from ml.tools.dataset_report")
    ap.add_argument("--parity", default=None, help="JSON with export parity + browser-runtime results")
    ap.add_argument("--min-test-subjects", type=int, default=3)
    ap.add_argument("--min-form-f1", type=float, default=None)
    ap.add_argument("--min-mistake-f1", type=float, default=None)
    ap.add_argument("--min-coach-confidence", type=float, default=None)
    ap.add_argument("--out", default=None)
    args = ap.parse_args(argv)

    inputs, notes = {}, []
    for key, path, label in (("metrics", args.metrics, "metrics"),
                             ("rep", args.rep_report, "rep report"),
                             ("dataset", args.dataset_report, "dataset report"),
                             ("parity", args.parity, "parity report")):
        data, note = load(path, label)
        inputs[key] = data
        if note:
            notes.append(note)

    conditions = evaluate(args.exercise, inputs["metrics"], inputs["rep"], inputs["dataset"],
                          inputs["parity"], args.min_test_subjects, args.min_form_f1,
                          args.min_mistake_f1, args.min_coach_confidence)
    passed = all(c["pass"] for c in conditions)

    print(f"quality gate — {args.exercise}\n")
    for item in conditions:
        print(f"  [{'PASS' if item['pass'] else 'FAIL'}] {item['condition']}"
              + (f"  — {item['detail']}" if item["detail"] else ""))
    for note in notes:
        print(f"  (missing input) {note}")
    print(f"\nRESULT: {'PASS — publication allowed' if passed else 'FAIL — do not publish'}")
    if not passed:
        print("A completed training run is not a production-quality model.")

    report = {"exercise": args.exercise, "passed": passed, "conditions": conditions, "missing": notes}
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"wrote {args.out}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
