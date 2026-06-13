"""Greedy center-distance dedupe across video frames."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.config import Settings
    from app.schemas import TreeDetection


def _center(det: TreeDetection) -> tuple[float, float]:
    pts = det.xyxyxyxy
    if len(pts) < 8:
        return 0.5, 0.5
    xs = [pts[i] for i in range(0, 8, 2)]
    ys = [pts[i] for i in range(1, 8, 2)]
    return sum(xs) / len(xs), sum(ys) / len(ys)


def _dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def effective_dedupe_center_distance(settings: Settings, duration_seconds: float) -> float:
    """Long clips use base dedupe; short clips use tighter clustering."""
    base = float(settings.dedupe_center_distance)
    threshold = float(settings.short_clip_max_duration_seconds)
    short = float(settings.short_clip_dedupe_center_distance)
    if duration_seconds > 0 and duration_seconds < threshold:
        return max(base, short)
    return base


def unique_tree_estimate_center_greedy(
    detections: list[TreeDetection],
    *,
    min_confidence: float,
    center_distance_threshold: float,
) -> int:
    """Count unique trees by greedy clustering on normalized OBB centers."""
    filtered = [d for d in detections if d.confidence >= min_confidence]
    if not filtered:
        return 0

    filtered.sort(key=lambda d: d.confidence, reverse=True)
    clusters: list[tuple[float, float]] = []

    for det in filtered:
        c = _center(det)
        if any(_dist(c, existing) < center_distance_threshold for existing in clusters):
            continue
        clusters.append(c)

    return len(clusters)
