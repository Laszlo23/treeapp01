"""Internal routes for TreeGens Node backend."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.schemas import VerifyVideoResponse
from app.services.media_inference import (
    is_image_content_type,
    is_video_content_type,
    verification_tuples_for_media,
)
from app.services.verification import check_metadata, merge_blocks_for_response
from app.services.video_frames import VideoFrameError

router = APIRouter(prefix="/internal", tags=["internal"])


def _require_internal_key(
    x_internal_key: str | None = Header(default=None, alias="X-Internal-Key"),
    settings: Settings = Depends(get_settings),
) -> None:
    if not x_internal_key or x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Internal-Key")


def _parse_captured_at_iso(value: str) -> datetime:
    raw = (value or "").strip()
    if not raw:
        raise HTTPException(status_code=422, detail="captured_at is required")
    try:
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        return datetime.fromisoformat(raw)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"invalid captured_at: {value}") from e


@router.post("/verify-video", response_model=VerifyVideoResponse)
async def verify_video(
    video: UploadFile = File(...),
    captured_at: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    claimed_tree_count: int | None = Form(default=None),
    _: None = Depends(_require_internal_key),
    settings: Settings = Depends(get_settings),
) -> VerifyVideoResponse:
    raw = await video.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    max_bytes = max(settings.max_video_bytes, settings.max_upload_bytes)
    if len(raw) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds max size ({max_bytes} bytes)")

    ct = (video.content_type or "").split(";")[0].strip().lower() or "application/octet-stream"
    if not is_video_content_type(ct, settings) and not is_image_content_type(ct, settings):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type for verification: {ct}",
        )

    cap_dt = _parse_captured_at_iso(captured_at)
    meta = check_metadata(cap_dt, latitude, longitude, settings)

    try:
        tuples, video_duration = verification_tuples_for_media(raw, ct, 0, settings, meta)
    except VideoFrameError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    block = merge_blocks_for_response(meta, tuples, settings, video_duration)

    unique_est = 0
    total_dets = 0
    img_eval = 0
    if block.model and block.model.confidence_summary:
        cs = block.model.confidence_summary
        raw_ue = cs.get("unique_tree_estimate")
        if isinstance(raw_ue, int):
            unique_est = raw_ue
        raw_td = cs.get("total_tree_detections")
        if isinstance(raw_td, int):
            total_dets = raw_td
        raw_ie = cs.get("images_evaluated")
        if isinstance(raw_ie, int):
            img_eval = raw_ie

    count_claim_match: bool | None = None
    count_delta: int | None = None
    if claimed_tree_count is not None:
        count_delta = unique_est - claimed_tree_count
        count_claim_match = abs(count_delta) <= settings.claim_count_max_delta

    return VerifyVideoResponse(
        verification=block,
        model_version=settings.model_version,
        unique_tree_estimate=unique_est,
        total_tree_detections=total_dets,
        images_evaluated=img_eval,
        claimed_tree_count=claimed_tree_count,
        count_claim_match=count_claim_match,
        count_delta=count_delta,
    )
