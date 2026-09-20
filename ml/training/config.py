"""Training configuration. Pilot exercises only — see ml/README.md."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict

from ..preprocessing.pose_features import FEATURE_SIZE, FEATURE_VERSION

PHASES = ("start", "descending", "bottom", "ascending", "complete")
FORMS = ("correct", "incorrect")
REP_VALID = ("no", "yes")

# The 14 manual exercises stay manual, and the other 12 camera exercises keep
# using the rule engine, until a dataset exists for them.
MISTAKES = {
    "squat": ("none", "shallow", "knee_inward", "forward_lean", "incomplete_rep"),
    "pushup": ("none", "shallow", "hips_down", "hips_up", "incomplete_rep"),
    "lunge": ("none", "knee_inward", "short_range", "unstable"),
}
SEQUENCE_LENGTH = {"squat": 45, "pushup": 45, "lunge": 60}


@dataclass
class TrainConfig:
    exercise: str = "squat"
    feature_version: int = FEATURE_VERSION
    feature_size: int = FEATURE_SIZE
    sequence_length: int = 45
    hop: int = 5
    # model — deliberately small: this runs on a mid-range phone
    hidden: int = 64
    layers: int = 1
    dropout: float = 0.2
    # optimisation
    epochs: int = 40
    batch_size: int = 64
    lr: float = 1e-3
    weight_decay: float = 1e-4
    patience: int = 8
    seed: int = 1337
    # data
    val_subjects: float = 0.2
    test_subjects: float = 0.2
    flip_augment: bool = True
    head_weights: dict = field(default_factory=lambda: {"phase": 1.0, "form": 1.0, "mistake": 1.0, "rep_valid": 1.5})

    @classmethod
    def for_exercise(cls, exercise: str, **overrides) -> "TrainConfig":
        if exercise not in MISTAKES:
            raise ValueError(f"unknown pilot exercise {exercise!r}; have {sorted(MISTAKES)}")
        cfg = cls(exercise=exercise, sequence_length=SEQUENCE_LENGTH[exercise])
        for k, v in overrides.items():
            if v is not None and hasattr(cfg, k):
                setattr(cfg, k, v)
        return cfg

    @property
    def head_sizes(self) -> dict:
        return {"phase": len(PHASES), "form": len(FORMS), "mistake": len(MISTAKES[self.exercise]), "rep_valid": len(REP_VALID)}

    def to_dict(self) -> dict:
        return asdict(self)
