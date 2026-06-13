#!/usr/bin/env bash
# End-to-end checks for production treegens.app (run when VPS is online).
set -euo pipefail

WEB="${TREEGENS_WEB_URL:-https://treegens.app}"
API="${TREEGENS_API_URL:-https://treegens.app/api}"

echo "=== Web ==="
code=$(curl -sS -m 20 -o /dev/null -w "%{http_code}" "$WEB/" || echo "000")
echo "GET $WEB/ -> HTTP $code"
[[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]] || exit 1

echo "=== API health ==="
curl -sS -m 20 "$API/health" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('status:', d.get('status', d))
"

echo "=== ML API (on VPS localhost — run on server) ==="
echo "ssh treegens-vps 'curl -sf http://127.0.0.1:8000/health'"

echo "E2E smoke OK (web + API reachable)"
