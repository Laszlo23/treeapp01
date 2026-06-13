#!/usr/bin/env bash
# Deploy treegens-app ML stack on VPS (run from repo root on server).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env and set secrets first."
  exit 1
fi

if [[ ! -f models/best.pt ]]; then
  echo "WARNING: models/best.pt missing — API will start but inference returns stub/empty."
fi

export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
docker compose build api
docker compose up -d
sleep 10
docker compose ps
curl -sf "http://127.0.0.1:8000/health" | python3 -m json.tool

echo "Deploy OK. Run: ./scripts/smoke-verify.sh /path/to/video.mp4 40"
