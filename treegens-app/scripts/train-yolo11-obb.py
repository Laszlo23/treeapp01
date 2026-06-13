#!/usr/bin/env python3
"""
Train YOLO11-OBB on the TreeGens mangrove planting dataset.

Prerequisites:
  pip install ultralytics
  Export dataset YAML from Ultralytics Platform, or use local copy:
    treegens-mangrove-planting/data.yaml

Usage:
  python scripts/train-yolo11-obb.py --data /path/to/data.yaml
  python scripts/train-yolo11-obb.py --data data.yaml --model yolo11s-obb.pt --epochs 100
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Train YOLO11-OBB for mangrove counting")
    parser.add_argument(
        "--data",
        required=True,
        help="Path to dataset data.yaml (from Ultralytics export)",
    )
    parser.add_argument(
        "--model",
        default="yolo11n-obb.pt",
        help="Base checkpoint (yolo11n-obb.pt or yolo11s-obb.pt)",
    )
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=960)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--patience", type=int, default=20)
    parser.add_argument("--project", default="runs/treegens-mangrove")
    parser.add_argument("--name", default="yolo11-obb-v1")
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.is_file():
        raise SystemExit(f"Dataset not found: {data_path}")

    from ultralytics import YOLO

    model = YOLO(args.model)
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        project=args.project,
        name=args.name,
    )

    best = Path(args.project) / args.name / "weights" / "best.pt"
    print(f"\nTraining complete. Best weights: {best}")
    print(f"Copy to production: cp {best} models/best.pt")
    print("Then: docker compose build api && docker compose up -d api")


if __name__ == "__main__":
    main()
