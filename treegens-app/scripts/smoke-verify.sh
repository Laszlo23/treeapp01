#!/usr/bin/env bash
# Smoke-test POST /internal/verify-video
set -euo pipefail

VIDEO="${1:?Usage: smoke-verify.sh <video.mp4> [claimed_count]}"
CLAIMED="${2:-}"
API_URL="${PLANTING_VERIFICATION_API_URL:-http://127.0.0.1:8000}"
KEY="${PLANTING_VERIFICATION_INTERNAL_KEY:-internal-dev-key}"

ARGS=(
  -sS -m 180
  -X POST "${API_URL}/internal/verify-video"
  -H "X-Internal-Key: ${KEY}"
  -F "video=@${VIDEO};type=video/mp4"
  -F "captured_at=2026-05-21T21:08:28Z"
  -F "latitude=0"
  -F "longitude=0"
)
if [[ -n "$CLAIMED" ]]; then
  ARGS+=(-F "claimed_tree_count=${CLAIMED}")
fi

curl "${ARGS[@]}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'detail' in d and 'unique_tree_estimate' not in d:
    print('ERROR:', d)
    sys.exit(1)
print('unique_tree_estimate:', d.get('unique_tree_estimate'))
print('images_evaluated:', d.get('images_evaluated'))
print('count_claim_match:', d.get('count_claim_match'))
print('count_delta:', d.get('count_delta'))
"
