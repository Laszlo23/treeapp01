"""Evenly sample JPEG frames from uploaded video bytes."""

from __future__ import annotations

import tempfile
from pathlib import Path

import cv2
import numpy as np

from app.config import Settings


class VideoFrameError(Exception):
    pass


def _suffix_for_mime(content_type: str) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    if "quicktime" in ct or ct == "video/mov":
        return ".mov"
    if "webm" in ct:
        return ".webm"
    if "matroska" in ct or "mkv" in ct:
        return ".mkv"
    return ".mp4"


def sample_frames_from_video_bytes(
    data: bytes,
    content_type: str,
    settings: Settings,
) -> tuple[list[tuple[int, bytes]], float]:
    """
    Sample frames evenly across the clip (capped by duration / interval).

    Returns ([(frame_index, jpeg_bytes), ...], duration_seconds).
    """
    if not data:
        raise VideoFrameError("empty video payload")

    suffix = _suffix_for_mime(content_type)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(data)
        tmp.flush()
        path = tmp.name
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            raise VideoFrameError("could not open video for decoding")

        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if frame_count <= 0:
            cap.release()
            raise VideoFrameError("video has no decodable frames")

        duration = frame_count / fps if fps > 0 else 0.0
        if duration > settings.video_max_duration_seconds:
            cap.release()
            raise VideoFrameError(
                f"video duration {duration:.1f}s exceeds max "
                f"{settings.video_max_duration_seconds}s"
            )

        max_by_cap = min(settings.video_sample_frames, frame_count)
        interval = settings.video_sample_interval_seconds
        if duration > 0 and interval > 0:
            max_by_spacing = max(1, int(duration / interval) + 1)
            n = min(max_by_cap, max_by_spacing)
        else:
            n = max_by_cap

        if n <= 0:
            cap.release()
            raise VideoFrameError("no frames to sample")

        indices = np.linspace(0, frame_count - 1, num=n, dtype=int).tolist()
        out: list[tuple[int, bytes]] = []

        for target_idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(target_idx))
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            ok_enc, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if ok_enc:
                out.append((int(target_idx), buf.tobytes()))

        cap.release()

    if not out:
        raise VideoFrameError("failed to sample any frames from video")
    return out, duration
