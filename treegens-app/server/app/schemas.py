"""Pydantic schemas for verification responses."""

from typing import Any

from pydantic import BaseModel, Field


class TreeDetection(BaseModel):
    confidence: float
    class_id: int = 0
    class_name: str = "Tree"
    xyxyxyxy: list[float] = Field(default_factory=list)


class ModelVerificationSummary(BaseModel):
    tree_detections: list[TreeDetection] = Field(default_factory=list)
    confidence_summary: dict[str, Any] = Field(default_factory=dict)
    image_index: int | None = None


class MetadataVerification(BaseModel):
    geo_ok: bool = True
    time_ok: bool = True
    geo_message: str | None = None
    time_message: str | None = None


class VerificationBlock(BaseModel):
    model: ModelVerificationSummary | None = None
    metadata: MetadataVerification = Field(default_factory=MetadataVerification)
    aggregate_pass: bool = False


class VerifyVideoResponse(BaseModel):
    verification: VerificationBlock
    model_version: str
    unique_tree_estimate: int
    total_tree_detections: int
    images_evaluated: int
    claimed_tree_count: int | None = None
    count_claim_match: bool | None = None
    count_delta: int | None = None
