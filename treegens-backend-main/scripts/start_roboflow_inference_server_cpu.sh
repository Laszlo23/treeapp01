#!/usr/bin/env bash
set -euo pipefail
# Starts Roboflow Inference Server (CPU image) exposing container port 9001 on *host* port HOST_PORT.
#
# IMPORTANT: Many hosts already use localhost:9001 for MinIO. Use HOST_PORT=9080 (default) instead.
#
# Inference UI answers at http://127.0.0.1:${HOST_PORT}/ ; some images do not expose /health.
#
# Docs: https://inference.roboflow.com/quickstart/docker/

HOST_PORT="${HOST_PORT:-9080}"
CONTAINER="${CONTAINER:-roboflow-inference-cpu}"

if curl -sf "http://127.0.0.1:${HOST_PORT}/" >/dev/null 2>&1; then
  echo "Something already responds at http://127.0.0.1:${HOST_PORT}/ ; skip docker start."
  exit 0
fi

docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
docker run -d \
  --name "${CONTAINER}" \
  -p "${HOST_PORT}:9001" \
  roboflow/roboflow-inference-server-cpu:latest

echo "Started ${CONTAINER} → http://127.0.0.1:${HOST_PORT}/ (_inference inside container listens on 9001)"
