"""FastAPI application entrypoint."""

from fastapi import FastAPI

from app.config import get_settings
from app.routers.internal import router as internal_router

app = FastAPI(
    title="TreeGens Mangrove Planting Proof API",
    version="1.0.0",
    description="Self-hosted YOLO OBB video verification for mangrove planting submissions.",
)

app.include_router(internal_router)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    from pathlib import Path

    model_ok = Path(settings.model_path).is_file()
    return {
        "status": "ok",
        "model_version": settings.model_version,
        "model_loaded": model_ok,
        "model_path": settings.model_path,
    }
