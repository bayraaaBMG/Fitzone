"""Python and browser feature extractors must agree.

Training features come from ml/preprocessing; inference features come from
js/ai/ml-features.js. If the two drift, a model trained here would silently see
different numbers in the browser — the failure would look like "the AI is bad"
rather than "the code disagrees". This test is the guard.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
import pytest

from ..preprocessing.pose_features import FEATURE_SIZE, FEATURE_VERSION, FeatureExtractor
from ..preprocessing.normalize import L_HIP, R_HIP, L_KN, L_SH
from .fixtures import skeleton

DRIVER = Path(__file__).with_name("js_parity_driver.cjs")
# numpy works in float32, JS in doubles rounded into a Float32Array, so a few
# 1e-7 differences are expected. Motion channels divide by dt (>= 0.03 s), which
# amplifies that round-off by up to ~33x — hence the looser bound for them.
TOLERANCE = 1e-5
MOTION_TOLERANCE = 1e-4


def make_frames():
    """A mix of ordinary frames and the awkward ones: missing joints, off-frame,
    low visibility, wide aspect, big time gaps, and a frame with no person."""
    rng = np.random.default_rng(4242)
    frames = []
    ts = 0.0
    for i in range(24):
        ts += float(rng.integers(30, 140))
        knee = float(rng.uniform(60, 178))
        lm = skeleton(knee_deg=knee, x=float(rng.uniform(0.25, 0.75)), y=float(rng.uniform(0.3, 0.6)),
                      scale=float(rng.uniform(0.6, 1.2)), vis=float(rng.uniform(0.35, 1.0)))
        if i == 5:
            lm = skeleton(missing=(L_KN,))
        if i == 9:
            lm = skeleton(off_frame=True)
        if i == 13:
            lm = None
        if i == 17:
            lm = skeleton(missing=(L_HIP, R_HIP))
        if i == 20:
            lm[L_SH]["visibility"] = 0.29  # just under the threshold
        frames.append({"lm": lm, "aspect": 1.78 if i % 3 else 1.0, "ts": ts})
    return frames


@pytest.mark.skipif(shutil.which("node") is None, reason="node is needed to run the browser extractor")
def test_python_and_javascript_features_match():
    frames = make_frames()
    proc = subprocess.run([shutil.which("node"), str(DRIVER)], input=json.dumps(frames and {"frames": frames}),
                          capture_output=True, text=True, timeout=120)
    assert proc.returncode == 0, proc.stderr
    js = json.loads(proc.stdout)
    assert js["featureSize"] == FEATURE_SIZE and js["featureVersion"] == FEATURE_VERSION

    fx = FeatureExtractor()
    worst = 0.0
    for i, frame in enumerate(frames):
        vec, valid = fx.push(frame["lm"], frame["aspect"], frame["ts"])
        got = js["frames"][i]
        assert got["valid"] == valid, f"frame {i}: validity disagrees (py={valid}, js={got['valid']})"
        if not valid:
            continue
        delta = np.abs(np.asarray(got["vec"], dtype=np.float64) - vec.astype(np.float64))
        static, motion = float(np.max(delta[:144])), float(np.max(delta[144:]))
        worst = max(worst, static, motion)
        assert static <= TOLERANCE, f"frame {i}: landmark/shape features differ by {static}"
        assert motion <= MOTION_TOLERANCE, f"frame {i}: motion features differ by {motion}"
    assert worst <= MOTION_TOLERANCE
    print(f"max |python - javascript| = {worst:.2e} over {len(frames)} frames")
