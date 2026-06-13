"""TreeGens Mangrove Planting Proof API — settings."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    internal_api_key: str = Field(default="internal-dev-key", alias="INTERNAL_API_KEY")
    jwt_secret: str = Field(default="change-me", alias="JWT_SECRET")

    model_path: str = Field(default="/models/best.pt", alias="MODEL_PATH")
    model_version: str = Field(default="yolo11-obb-v1", alias="MODEL_VERSION")

    video_sample_frames: int = Field(default=48, ge=1, alias="VIDEO_SAMPLE_FRAMES")
    video_sample_interval_seconds: float = Field(
        default=0.4,
        gt=0,
        alias="VIDEO_SAMPLE_INTERVAL_SECONDS",
        description="Target seconds between sampled frames; count is min(frames_cap, duration/interval).",
    )
    video_max_duration_seconds: float = Field(default=120.0, gt=0, alias="VIDEO_MAX_DURATION_SECONDS")

    dedupe_center_distance: float = Field(default=0.085, gt=0, alias="DEDUPE_CENTER_DISTANCE")
    short_clip_max_duration_seconds: float = Field(
        default=20.0,
        gt=0,
        alias="SHORT_CLIP_MAX_DURATION_SECONDS",
    )
    short_clip_dedupe_center_distance: float = Field(
        default=0.11,
        gt=0,
        alias="SHORT_CLIP_DEDUPE_CENTER_DISTANCE",
    )

    min_tree_confidence: float = Field(default=0.24, ge=0, le=1, alias="MIN_TREE_CONFIDENCE")
    yolo_imgsz: int = Field(default=960, ge=32, alias="YOLO_IMGSZ")
    yolo_predict_conf: float = Field(default=0.01, ge=0, le=1, alias="YOLO_PREDICT_CONF")

    max_video_bytes: int = Field(default=104_857_600, ge=1, alias="MAX_VIDEO_BYTES")
    max_upload_bytes: int = Field(default=104_857_600, ge=1, alias="MAX_UPLOAD_BYTES")

    claim_count_max_delta: int = Field(default=2, ge=0, alias="CLAIM_COUNT_MAX_DELTA")

    allowed_image_types: str = Field(
        default="image/jpeg,image/png,image/webp",
        alias="ALLOWED_IMAGE_TYPES",
    )
    allowed_video_types: str = Field(
        default="video/mp4,video/quicktime,video/webm,video/x-matroska",
        alias="ALLOWED_VIDEO_TYPES",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
