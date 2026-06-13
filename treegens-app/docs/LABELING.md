# Dataset labeling guide — treegens-mangrove-planting

Dataset: https://platform.ultralytics.com/buildingculture/datasets/treegens-mangrove-planting

## Current state

- **732 images**, **120 labeled**, **3,596 annotations**
- OBB format, 1 class (mangrove seedling)
- Train/val split managed by Ultralytics Platform

## Target before retrain

Label **≥500 images** (prioritize clips that failed field verification).

## Labeling rules

1. Draw **oriented bounding boxes (OBB)** around each visible **fresh planted mangrove seedling**.
2. Include small shoots partially buried in mud; skip driftwood and mature trees.
3. Keep boxes tight on the seedling crown + stem visible above substrate.
4. Label consistently across sun/shade and tidal wet mud.

## Workflow on Ultralytics Platform

1. Open dataset → **Annotate** unlabeled images.
2. Use OBB tool; class name: `Tree` (matches production model output).
3. Export periodically; version the export in model training notes.
4. When ≥500 labeled, run training (see `scripts/train-yolo11-obb.py`).

## Prioritization queue

1. WhatsApp-style short clips (~5s, ~40 trees)
2. Long walk-through clips (MOV_0847 class, ~100 trees)
3. Edge cases: heavy shadow, water glare, sparse planting

## Quality check

After labeling a batch of 50 images, run a quick train (10 epochs) and eval with `scripts/smoke-verify.sh` on reference videos before full 100-epoch run.
