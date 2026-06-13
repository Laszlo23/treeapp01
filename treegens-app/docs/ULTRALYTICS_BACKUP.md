# Ultralytics Platform backup (failover)

Primary production path: **self-hosted** `treegens_ml` (this repo's FastAPI on port 8000).

Use Ultralytics Platform `/predict` as **backup** when the local ML container is down or during development.

## Deploy model on Ultralytics Platform

1. Open https://platform.ultralytics.com/buildingculture/datasets/treegens-mangrove-planting
2. **New Model** → train or upload `best.pt` from `scripts/train-yolo11-obb.py`
3. **Deploy** → copy the `/predict` endpoint URL and API key

## Backend configuration (treegens-backend-main/.env)

```env
# Primary
AI_PROVIDER=treegens_ml
PLANTING_VERIFICATION_API_URL=http://127.0.0.1:8000
PLANTING_VERIFICATION_INTERNAL_KEY=internal-dev-key

# Backup / failover
AI_FAILOVER_TO_ULTRALYTICS=true
AI_API_PREDICT_URL=https://<your-ultralytics-endpoint>/predict
AI_API_BEARER_TOKEN=<platform-api-key>
AI_ULTRALYTICS_INPUT_MODE=middle_frame_jpeg
```

When `AI_FAILOVER_TO_ULTRALYTICS=true`, the backend tries `treegens_ml` first; on timeout or 5xx it falls back to Ultralytics and records `provider: ultralytics_failover` in `aiVerification`.

## Limitations

- Ultralytics `/predict` uses a **single middle frame** (or raw video without multi-frame dedupe).
- Counts may differ from self-hosted path — use for availability, not parity.
- CoreML export (`model.export(format="coreml")`) is for **future iOS apps**, not this web stack.

## Switch to backup only (emergency)

```env
AI_PROVIDER=ultralytics
```

Revert to `treegens_ml` when the VPS ML container is healthy.
