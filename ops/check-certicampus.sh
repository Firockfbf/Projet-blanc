#!/usr/bin/env bash

set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1}"
API_URL="${API_URL:-$FRONTEND_URL/api/health}"
MAX_RETRIES="${MAX_RETRIES:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-3}"

check_url() {
  local url="$1"
  local label="$2"
  local attempt=1

  while [ "$attempt" -le "$MAX_RETRIES" ]; do
    if curl -fsS "$url" >/dev/null; then
      echo "$label is ready: $url"
      return 0
    fi

    echo "Waiting for $label ($attempt/$MAX_RETRIES): $url"
    sleep "$SLEEP_SECONDS"
    attempt=$((attempt + 1))
  done

  echo "$label did not become ready in time: $url" >&2
  return 1
}

check_url "$FRONTEND_URL" "frontend"
check_url "$API_URL" "api"
docker compose ps

echo "Smoke test passed for $FRONTEND_URL and $API_URL"
