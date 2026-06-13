#!/usr/bin/env bash
# Eval reference videos against local planting API.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMOKE="${ROOT}/scripts/smoke-verify.sh"

run() {
  local label="$1" path="$2" claim="$3"
  if [[ ! -f "$path" ]]; then
    echo "SKIP $label (missing $path)"
    return
  fi
  echo "=== $label (claim=$claim) ==="
  "$SMOKE" "$path" "$claim"
  echo
}

# Override paths via env or place files in ./test-videos/
VIDEOS_DIR="${VIDEOS_DIR:-${ROOT}/test-videos}"

run "WhatsApp ~5s" "${VIDEOS_DIR}/whatsapp.mp4" 40
run "MOV_0847" "${VIDEOS_DIR}/MOV_0847.mp4" 101
run "MOV_0849" "${VIDEOS_DIR}/MOV_0849.mp4" 101
run "MOV_0855" "${VIDEOS_DIR}/MOV_0855.mp4" 108
