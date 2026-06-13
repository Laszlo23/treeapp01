"""Merge per-frame results and compute unique tree estimate."""

from __future__ import annotations

from datetime import datetime, timezone

from app.config import Settings
from app.schemas import MetadataVerification, ModelVerificationSummary, TreeDetection, VerificationBlock
from app.services.detection_dedupe import (
    effective_dedupe_center_distance,
    unique_tree_estimate_center_greedy,
)
from app.services.yolo_inference import InferenceResult


def check_metadata(
    captured_at: datetime | None,
    latitude: float | None,
    longitude: float | None,
    settings: Settings,
) -> MetadataVerification:
    geo_ok = latitude is not None and longitude is not None
    time_ok = captured_at is not None
    return MetadataVerification(
        geo_ok=geo_ok,
        time_ok=time_ok,
        geo_message=None if geo_ok else "missing coordinates",
        time_message=None if time_ok else "missing captured_at",
    )


def policy_passes(
    inf: InferenceResult,
    meta: MetadataVerification,
    settings: Settings,
) -> bool:
    if inf.stub:
        return False
    if not meta.geo_ok or not meta.time_ok:
        return False
    strong = [d for d in inf.detections if d.confidence >= settings.min_tree_confidence]
    return len(strong) > 0


def merge_blocks_for_response(
    metadata: MetadataVerification,
    per_image: list[tuple[ModelVerificationSummary, bool]],
    settings: Settings,
    video_duration_seconds: float = 0.0,
) -> VerificationBlock:
    merged_detections: list[TreeDetection] = []
    images_evaluated = 0
    frame_passes = 0

    for msum, passed in per_image:
        images_evaluated += 1
        if passed:
            frame_passes += 1
        merged_detections.extend(msum.tree_detections)

    dedupe_dist = effective_dedupe_center_distance(settings, video_duration_seconds)
    unique_est = unique_tree_estimate_center_greedy(
        merged_detections,
        min_confidence=settings.min_tree_confidence,
        center_distance_threshold=dedupe_dist,
    )

    total_dets = len(merged_detections)
    confs = [d.confidence for d in merged_detections if d.confidence >= settings.min_tree_confidence]
    mean_conf = sum(confs) / len(confs) if confs else 0.0

    model = ModelVerificationSummary(
        tree_detections=merged_detections,
        confidence_summary={
            "images_evaluated": images_evaluated,
            "total_tree_detections": total_dets,
            "unique_tree_estimate": unique_est,
            "dedupe_method": "center_greedy",
            "dedupe_center_distance": dedupe_dist,
            "mean_confidence": mean_conf,
            "frames_policy_pass": frame_passes,
        },
        image_index=None,
    )

    aggregate_pass = frame_passes > 0 and unique_est > 0
    return VerificationBlock(
        model=model,
        metadata=metadata,
        aggregate_pass=aggregate_pass,
    )
