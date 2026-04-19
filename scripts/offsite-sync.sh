#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/bakery_ecom}"
OFFSITE_ENABLED="${BACKUP_OFFSITE_ENABLED:-false}"
OFFSITE_TOOL="${BACKUP_OFFSITE_TOOL:-rclone}"
OFFSITE_REMOTE="${BACKUP_OFFSITE_REMOTE:-}"

if [ "${OFFSITE_ENABLED,,}" != "true" ]; then
  echo "Offsite sync disabled"
  exit 0
fi

[ -n "$OFFSITE_REMOTE" ] || { echo "BACKUP_OFFSITE_REMOTE is required when offsite sync is enabled"; exit 1; }

LATEST_BACKUP_DIR="$(readlink -f "$BACKUP_DIR/latest" 2>/dev/null || true)"
[ -n "$LATEST_BACKUP_DIR" ] || { echo "No latest backup set found"; exit 1; }
[ -d "$LATEST_BACKUP_DIR" ] || { echo "Latest backup set is missing: $LATEST_BACKUP_DIR"; exit 1; }

backup_name="$(basename "$LATEST_BACKUP_DIR")"

case "$OFFSITE_TOOL" in
  rclone)
    command -v rclone >/dev/null 2>&1 || { echo "rclone is required for offsite sync"; exit 1; }
    rclone copy "$LATEST_BACKUP_DIR" "$OFFSITE_REMOTE/$backup_name"
    ;;
  *)
    echo "Unsupported BACKUP_OFFSITE_TOOL: $OFFSITE_TOOL"
    exit 1
    ;;
esac

echo "Offsite sync completed for $backup_name"
