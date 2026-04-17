#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-bakery_ecom}"
DATABASE_PATH="${DATABASE_PATH:-/var/lib/bakery_ecom/bakery.sqlite}"
UPLOADS_DIR="${UPLOADS_DIR:-/var/lib/bakery_ecom/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bakery_ecom}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ -f "$DATABASE_PATH" ]; then
  sqlite3 "$DATABASE_PATH" ".backup '$BACKUP_DIR/${APP_NAME}-db-${TIMESTAMP}.sqlite'"
fi

if [ -d "$UPLOADS_DIR" ]; then
  tar -czf "$BACKUP_DIR/${APP_NAME}-uploads-${TIMESTAMP}.tar.gz" -C "$UPLOADS_DIR" .
fi

echo "Backup completed in $BACKUP_DIR"
