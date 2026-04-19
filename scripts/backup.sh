#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-bakery_ecom}"
APP_USER="${APP_USER:-bakery}"
APP_GROUP="${APP_GROUP:-bakery}"
APP_ROOT="${APP_ROOT:-/var/www/bakery_ecom}"
CURRENT_LINK="${CURRENT_LINK:-$APP_ROOT/current}"
DATABASE_PATH="${DATABASE_PATH:-/var/lib/bakery_ecom/bakery.sqlite}"
UPLOADS_DIR="${UPLOADS_DIR:-/var/lib/bakery_ecom/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bakery_ecom}"
NGINX_LOG_DIR="${NGINX_LOG_DIR:-/var/log/nginx}"
JOURNAL_WINDOW="${JOURNAL_WINDOW:-1 day ago}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_SET_DIR="$BACKUP_DIR/sets/$TIMESTAMP"
HOSTNAME_VALUE="$(hostname -f 2>/dev/null || hostname)"
CURRENT_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

mkdir -p "$BACKUP_SET_DIR"

if [ -f "$DATABASE_PATH" ]; then
  sqlite3 "$DATABASE_PATH" ".backup '$BACKUP_SET_DIR/bakery.sqlite'"
fi

if [ -d "$UPLOADS_DIR" ]; then
  tar -czf "$BACKUP_SET_DIR/uploads.tar.gz" -C "$UPLOADS_DIR" .
fi

if command -v journalctl >/dev/null 2>&1; then
  journalctl -u "$APP_NAME" --since "$JOURNAL_WINDOW" --no-pager | gzip -c >"$BACKUP_SET_DIR/app-journal.log.gz"
fi

if [ -d "$NGINX_LOG_DIR" ]; then
  find "$NGINX_LOG_DIR" -maxdepth 1 -type f \( -name '*.log' -o -name '*.log.*' \) -print0 \
    | tar --null -czf "$BACKUP_SET_DIR/nginx-logs.tar.gz" --files-from -
fi

cat >"$BACKUP_SET_DIR/metadata.env" <<EOF
TIMESTAMP='$TIMESTAMP'
HOSTNAME='$HOSTNAME_VALUE'
APP_NAME='$APP_NAME'
DATABASE_PATH='$DATABASE_PATH'
UPLOADS_DIR='$UPLOADS_DIR'
CURRENT_RELEASE='${CURRENT_RELEASE:-unknown}'
NODE_ENV='${NODE_ENV:-unknown}'
EOF

(
  cd "$BACKUP_SET_DIR"
  if find . -maxdepth 1 -type f | grep -q .; then
    find . -maxdepth 1 -type f ! -name 'SHA256SUMS' -print0 \
      | LC_ALL=C sort -z \
      | xargs -0 sha256sum >SHA256SUMS
  fi
)

ln -sfn "$BACKUP_SET_DIR" "$BACKUP_DIR/latest"

if id "$APP_USER" >/dev/null 2>&1; then
  chown -R "$APP_USER:$APP_GROUP" "$BACKUP_SET_DIR"
  chown -h "$APP_USER:$APP_GROUP" "$BACKUP_DIR/latest"
fi

echo "Backup completed in $BACKUP_SET_DIR"
