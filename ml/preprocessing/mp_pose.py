"""MediaPipe pose extraction that matches what the app sees.

The browser (js/pose.js) runs the MediaPipe Tasks PoseLandmarker with the
*lite* float16 model and samples a frame at most every 80 ms (~12.5 fps).
Offline tools must do the same, or a replayed clip tests a different signal
from the one users produce:

- same model file:  POSE_MODEL_URL below is the exact URL js/pose.js loads
- same API:         Tasks PoseLandmarker in VIDEO mode (the legacy
                    `mp.solutions.pose` API is gone from current MediaPipe)
- same sampling:    `app_rate_indices()` picks the frames the app would process

The model is downloaded once into a local, git-ignored cache.
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

POSE_MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
                  "pose_landmarker_lite/float16/1/pose_landmarker_lite.task")
APP_FRAME_MS = 80.0          # js/pose.js: `if(ts - lastRun < 80 ...) return;`
DEFAULT_MODEL_DIR = Path(__file__).resolve().parent.parent / "eval" / "benchmark" / "models"


def model_path(model_dir: Path | None = None) -> Path:
    model_dir = Path(model_dir or DEFAULT_MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / "pose_landmarker_lite.task"
    if not path.exists() or path.stat().st_size < 1_000_000:
        tmp = path.with_suffix(".part")
        urllib.request.urlretrieve(POSE_MODEL_URL, tmp)
        tmp.replace(path)
    return path


def video_landmarks(video: str | Path, model_dir: Path | None = None):
    """All frames of a video → (frames, fps, aspect).

    frames[i] is a list of 33 {x, y, z, visibility} dicts, or None when no
    person was found. Every frame is kept (sampling is applied at replay time),
    so one extraction serves any replay rate.
    """
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions, vision

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise FileNotFoundError(f"cannot open {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480

    options = vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model_path(model_dir))),
        running_mode=vision.RunningMode.VIDEO, num_poses=1,
        # same confidences as js/pose.js
        min_pose_detection_confidence=0.5, min_pose_presence_confidence=0.5, min_tracking_confidence=0.5,
    )
    frames = []
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        index = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            result = landmarker.detect_for_video(image, int(round(index * 1000.0 / fps)))
            if result.pose_landmarks:
                frames.append([{"x": p.x, "y": p.y, "z": p.z,
                                "visibility": 1.0 if p.visibility is None else float(p.visibility)}
                               for p in result.pose_landmarks[0]])
            else:
                frames.append(None)
            index += 1
    cap.release()
    return frames, float(fps), float(width) / float(height or 1)


def app_rate_indices(n_frames: int, fps: float, step_ms: float = APP_FRAME_MS, raf_hz: float = 60.0) -> list[int]:
    """Indices of the frames the app's pose loop would actually process.

    Simulates js/pose.js exactly: the loop runs on requestAnimationFrame ticks
    (~60 Hz) and processes the newest camera frame only when at least 80 ms
    have passed since the last run AND that frame is new. With a 30 fps camera
    this alternates 67/100 ms gaps (~12 fps), not a flat "every 3rd frame".
    """
    out, last_run, last_frame = [], None, -1
    tick = 1000.0 / raf_hz
    duration = n_frames * 1000.0 / fps
    k = 0
    while True:
        t = k * tick
        if t >= duration:
            break
        frame = min(n_frames - 1, int(t * fps / 1000.0 + 1e-9))
        if (last_run is None or t - last_run >= step_ms - 1e-6) and frame != last_frame:
            out.append(frame)
            last_run, last_frame = t, frame
        k += 1
    return out
