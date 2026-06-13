"""Map uploaded media to per-frame model summaries."""

from __future__ import annotations

from app.config import Settings
from app.schemas import MetadataVerification, ModelVerificationSummary
from app.services.video_frames import sample_frames_from_video_bytes
from app.services.yolo_inference import run_obb_on_image
from app.services.verification import policy_passes


def _split_types(settings: Settings) -> tuple[set[str], set[str]]:
    images = {t.strip().lower() for t in settings.allowed_image_types.split(",") if t.strip()}
    videos = {t.strip().lower() for t in settings.allowed_video_types.split(",") if t.strip()}
    return images, videos


def is_image_content_type(content_type: str, settings: Settings) -> bool:
    ct = (content_type or "").split(";")[0].strip().lower()
    images, _ = _split_types(settings)
    return ct in images


def is_video_content_type(content_type: str, settings: Settings) -> bool:
    ct = (content_type or "").split(";")[0].strip().lower()
    _, videos = _split_types(settings)
    return ct in videos


def verification_tuples_for_media(
    raw: bytes,
    content_type: str,
    media_index: int,
    settings: Settings,
    meta: MetadataVerification,
) -> tuple[list[tuple[ModelVerificationSummary, bool]], float]:
    """
    Returns ([(model summary, pass), ...], video_duration_seconds).
    Images: one tuple. Videos: one tuple per sampled frame.
    """
    if is_image_content_type(content_type, settings):
        inf = run_obb_on_image(raw, settings)
        msum = ModelVerificationSummary(
            tree_detections=inf.detections,
            confidence_summary={
                **inf.raw_summary,
                "media_kind": "image",
                "media_index": media_index,
                "stub": inf.stub,
            },
            image_index=media_index,
        )
        return [(msum, policy_passes(inf, meta, settings))], 0.0

    if is_video_content_type(content_type, settings):
        frames, video_duration = sample_frames_from_video_bytes(raw, content_type, settings)
        out: list[tuple[ModelVerificationSummary, bool]] = []
        total = len(frames)
        for fi, (frame_idx, jpeg_bytes) in enumerate(frames):
            inf = run_obb_on_image(jpeg_bytes, settings)
            msum = ModelVerificationSummary(
                tree_detections=inf.detections,
                confidence_summary={
                    **inf.raw_summary,
                    "media_kind": "video",
                    "media_index": media_index,
                    "frame_index": frame_idx,
                    "frame_sample_index": fi,
                    "total_frames_sampled": total,
                    "stub": inf.stub,
                },
                image_index=media_index * 10000 + fi,
            )
            out.append((msum, policy_passes(inf, meta, settings)))
        return out, video_duration

    raise ValueError(f"unsupported content type for inference: {content_type}")
