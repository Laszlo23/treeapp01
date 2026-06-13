# TreeGens Mangrove Planting Proof API

Self-hosted **FastAPI + YOLO OBB** service for counting freshly planted mangroves in planter videos.

Used by the TreeGens Node backend (`AI_PROVIDER=treegens_ml`) via:

```
POST /internal/verify-video
X-Internal-Key: <INTERNAL_API_KEY>
```

## Quick start (local)

```bash
cp .env.example .env
# Add models/best.pt
docker compose up -d --build
./scripts/smoke-verify.sh /path/to/video.mp4 40
```

## Key tuning (validated)

| Setting | Value |
|---------|-------|
| `VIDEO_SAMPLE_FRAMES` | 48 |
| `VIDEO_SAMPLE_INTERVAL_SECONDS` | 0.5 |
| `DEDUPE_CENTER_DISTANCE` | 0.079 (long clips) |
| `SHORT_CLIP_DEDUPE_CENTER_DISTANCE` | 0.11 (<10s clips) |

## Docs

- [DEPLOY.md](docs/DEPLOY.md) — VPS full stack
- [RECOVERY.md](docs/RECOVERY.md) — server down / fresh VPS
- [LABELING.md](docs/LABELING.md) — Ultralytics dataset labeling
- [ULTRALYTICS_BACKUP.md](docs/ULTRALYTICS_BACKUP.md) — Platform failover

## Training

```bash
python scripts/train-yolo11-obb.py --data /path/to/data.yaml
```

Dataset: https://platform.ultralytics.com/buildingculture/datasets/treegens-mangrove-planting
