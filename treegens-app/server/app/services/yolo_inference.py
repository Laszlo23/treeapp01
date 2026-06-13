"""YOLO OBB inference wrapper."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import Settings
from app.schemas import TreeDetection


@dataclass
class InferenceResult:
    detections: list[TreeDetection] = field(default_factory=list)
    raw_summary: dict[str, Any] = field(default_factory=dict)
    stub: bool = False


_model_cache: dict[str, Any] = {}


def _load_yolo(model_path: str):
    if model_path in _model_cache:
        return _model_cache[model_path]
    from ultralytics import YOLO

    model = YOLO(model_path)
    _model_cache[model_path] = model
    return model


def _model_available(settings: Settings) -> bool:
    path = settings.model_path
    return bool(path) and Path(path).is_file()


def run_obb_on_image(image_bytes: bytes, settings: Settings) -> InferenceResult:
    """Run YOLO OBB on a JPEG buffer; returns normalized detections."""
    if not _model_available(settings):
        return InferenceResult(
            detections=[],
            raw_summary={"stub": True, "reason": "model_not_found", "path": settings.model_path},
            stub=True,
        )

    from ultralytics import YOLO

    model = _load_yolo(settings.model_path)
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=True) as tmp:
        tmp.write(image_bytes)
        tmp.flush()
        results = model.predict(
            source=tmp.name,
            imgsz=settings.yolo_imgsz,
            conf=settings.yolo_predict_conf,
            verbose=False,
        )

    detections: list[TreeDetection] = []
    if results:
        r0 = results[0]
        boxes = getattr(r0, "obb", None)
        if boxes is not None and len(boxes) > 0:
            xywhr = boxes.xywhr.cpu().numpy() if hasattr(boxes, "xywhr") else None
            confs = boxes.conf.cpu().numpy() if hasattr(boxes, "conf") else []
            cls_ids = boxes.cls.cpu().numpy() if hasattr(boxes, "cls") else []
            # Prefer xyxyxyxy normalized if available
            xyxyxyxyn = getattr(boxes, "xyxyxyxyn", None)
            if xyxyxyxyn is not None:
                polys = xyxyxyxyn.cpu().numpy()
                for i, poly in enumerate(polys):
                    conf = float(confs[i]) if i < len(confs) else 0.0
                    cls_id = int(cls_ids[i]) if i < len(cls_ids) else 0
                    detections.append(
                        TreeDetection(
                            confidence=conf,
                            class_id=cls_id,
                            class_name="Tree",
                            xyxyxyxy=[float(x) for x in poly.flatten().tolist()],
                        )
                    )
            elif xywhr is not None:
                h, w = r0.orig_shape if hasattr(r0, "orig_shape") else (1, 1)
                for i, row in enumerate(xywhr):
                    cx, cy, bw, bh, _ = [float(x) for x in row]
                    conf = float(confs[i]) if i < len(confs) else 0.0
                    cls_id = int(cls_ids[i]) if i < len(cls_ids) else 0
                    half_w, half_h = bw / 2, bh / 2
                    x1, y1 = (cx - half_w) / w, (cy - half_h) / h
                    x2, y2 = (cx + half_w) / w, (cy - half_h) / h
                    x3, y3 = (cx + half_w) / w, (cy + half_h) / h
                    x4, y4 = (cx - half_w) / w, (cy + half_h) / h
                    detections.append(
                        TreeDetection(
                            confidence=conf,
                            class_id=cls_id,
                            class_name="Tree",
                            xyxyxyxy=[x1, y1, x2, y2, x3, y3, x4, y4],
                        )
                    )

    mean_conf = (
        sum(d.confidence for d in detections) / len(detections) if detections else 0.0
    )
    return InferenceResult(
        detections=detections,
        raw_summary={
            "detection_count": len(detections),
            "mean_confidence": mean_conf,
            "stub": False,
        },
        stub=False,
    )
