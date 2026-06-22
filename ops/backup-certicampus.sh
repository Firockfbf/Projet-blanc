#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_FILE="$BACKUP_DIR/certicampus-$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

docker compose ps backend >/dev/null
docker cp certicampus-backend:/app/data/app.db "$TARGET_FILE"
find "$BACKUP_DIR" -type f -name 'certicampus-*.db' -mtime +"$RETENTION_DAYS" -delete

echo "Backup created: $TARGET_FILE"
