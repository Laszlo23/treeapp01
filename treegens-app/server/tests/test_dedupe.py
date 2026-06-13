"""Unit tests for detection dedupe."""

from app.schemas import TreeDetection
from app.services.detection_dedupe import (
    effective_dedupe_center_distance,
    unique_tree_estimate_center_greedy,
)


class _FakeSettings:
    dedupe_center_distance = 0.079
    short_clip_max_duration_seconds = 10.0
    short_clip_dedupe_center_distance = 0.11


def _det(cx: float, cy: float, conf: float = 0.9) -> TreeDetection:
    hw = 0.02
    return TreeDetection(
        confidence=conf,
        xyxyxyxy=[
            cx - hw,
            cy - hw,
            cx + hw,
            cy - hw,
            cx + hw,
            cy + hw,
            cx - hw,
            cy + hw,
        ],
    )


def test_effective_dedupe_short_clip():
    s = _FakeSettings()
    assert effective_dedupe_center_distance(s, 5.0) == 0.11


def test_effective_dedupe_long_clip():
    s = _FakeSettings()
    assert effective_dedupe_center_distance(s, 30.0) == 0.079


def test_unique_estimate_merges_nearby():
    dets = [_det(0.5, 0.5), _det(0.51, 0.51), _det(0.8, 0.8)]
    n = unique_tree_estimate_center_greedy(
        dets, min_confidence=0.5, center_distance_threshold=0.05
    )
    assert n == 2


def test_unique_estimate_respects_confidence():
    dets = [_det(0.5, 0.5, 0.9), _det(0.8, 0.8, 0.1)]
    n = unique_tree_estimate_center_greedy(
        dets, min_confidence=0.5, center_distance_threshold=0.05
    )
    assert n == 1
