#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <db-backup-file> <uploads-backup-file>"
  exit 1
fi

DATABASE_PATH="${DATABASE_PATH:-/var/lib/bakery_ecom/bakery.sqlite}"
UPLOADS_DIR="${UPLOADS_DIR:-/var/lib/bakery_ecom/uploads}"
APP_NAME="${APP_NAME:-bakery_ecom}"
DB_BACKUP="$1"
UPLOADS_BACKUP="$2"

systemctl stop "$APP_NAME"
mkdir -p "$(dirname "$DATABASE_PATH")" "$UPLOADS_DIR"
cp "$DB_BACKUP" "$DATABASE_PATH"
rm -rf "$UPLOADS_DIR"/*
tar -xzf "$UPLOADS_BACKUP" -C "$UPLOADS_DIR"
systemctl start "$APP_NAME"

echo "Restore completed"
