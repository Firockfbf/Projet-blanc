#!/usr/bin/env bash

set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1}"
API_URL="${API_URL:-$FRONTEND_URL/api/health}"

curl -fsS "$FRONTEND_URL" >/dev/null
curl -fsS "$API_URL" >/dev/null
docker compose ps

echo "Smoke test passed for $FRONTEND_URL and $API_URL"
