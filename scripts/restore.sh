#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <backup-set-dir> [--restore-logs-to <directory>]"
  exit 1
}

[ "$#" -ge 1 ] || usage

BACKUP_SET_DIR="$1"
shift

LOG_RESTORE_DIR=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --restore-logs-to)
      shift
      [ "$#" -gt 0 ] || usage
      LOG_RESTORE_DIR="$1"
      ;;
    *)
      usage
      ;;
  esac
  shift
done

DATABASE_PATH="${DATABASE_PATH:-/var/lib/bakery_ecom/bakery.sqlite}"
UPLOADS_DIR="${UPLOADS_DIR:-/var/lib/bakery_ecom/uploads}"
APP_NAME="${APP_NAME:-bakery_ecom}"
APP_USER="${APP_USER:-bakery}"
APP_GROUP="${APP_GROUP:-bakery}"

DB_BACKUP="$BACKUP_SET_DIR/bakery.sqlite"
UPLOADS_BACKUP="$BACKUP_SET_DIR/uploads.tar.gz"
JOURNAL_BACKUP="$BACKUP_SET_DIR/app-journal.log.gz"
NGINX_BACKUP="$BACKUP_SET_DIR/nginx-logs.tar.gz"

[ -d "$BACKUP_SET_DIR" ] || { echo "Backup set directory not found: $BACKUP_SET_DIR"; exit 1; }
[ -f "$DB_BACKUP" ] || { echo "Database backup not found: $DB_BACKUP"; exit 1; }
[ -f "$UPLOADS_BACKUP" ] || { echo "Uploads backup not found: $UPLOADS_BACKUP"; exit 1; }

systemctl stop "$APP_NAME"
mkdir -p "$(dirname "$DATABASE_PATH")" "$UPLOADS_DIR"
install -o "$APP_USER" -g "$APP_GROUP" -m 640 "$DB_BACKUP" "$DATABASE_PATH"
find "$UPLOADS_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$UPLOADS_BACKUP" -C "$UPLOADS_DIR"
chown -R "$APP_USER:$APP_GROUP" "$UPLOADS_DIR"

if [ -n "$LOG_RESTORE_DIR" ]; then
  mkdir -p "$LOG_RESTORE_DIR"
  if [ -f "$JOURNAL_BACKUP" ]; then
    gzip -dc "$JOURNAL_BACKUP" >"$LOG_RESTORE_DIR/app-journal.log"
  fi
  if [ -f "$NGINX_BACKUP" ]; then
    mkdir -p "$LOG_RESTORE_DIR/nginx"
    tar -xzf "$NGINX_BACKUP" -C "$LOG_RESTORE_DIR/nginx"
  fi
fi

systemctl start "$APP_NAME"

echo "Restore completed from $BACKUP_SET_DIR"
