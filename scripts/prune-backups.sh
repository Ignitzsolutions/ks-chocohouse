#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/bakery_ecom}"
DAILY_RETENTION="${DAILY_RETENTION:-7}"

mkdir -p "$BACKUP_DIR"
find "$BACKUP_DIR" -type f -mtime +"$DAILY_RETENTION" -delete

echo "Pruned backups older than $DAILY_RETENTION days"
