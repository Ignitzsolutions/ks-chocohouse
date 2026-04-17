#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <release-archive> <release-id> [env-file]"
  exit 1
fi

APP_NAME="${APP_NAME:-bakery_ecom}"
APP_USER="${APP_USER:-bakery}"
APP_GROUP="${APP_GROUP:-bakery}"
APP_ROOT="${APP_ROOT:-/var/www/bakery_ecom}"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
ENV_FILE="${ENV_FILE:-/etc/bakery_ecom/bakery_ecom.env}"
ARCHIVE_PATH="$1"
RELEASE_ID="$2"
NEW_ENV_FILE="${3:-}"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" || true)"
ENV_BACKUP=""
SUCCESS=0

cleanup() {
  local status=$?

  if [ "$SUCCESS" -eq 1 ]; then
    if [ -n "$ENV_BACKUP" ] && [ -f "$ENV_BACKUP" ]; then
      rm -f "$ENV_BACKUP"
    fi
    return
  fi

  if [ -n "$ENV_BACKUP" ] && [ -f "$ENV_BACKUP" ]; then
    install -o root -g root -m 600 "$ENV_BACKUP" "$ENV_FILE"
  fi

  if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    chown -h "$APP_USER:$APP_GROUP" "$CURRENT_LINK"
  fi

  systemctl restart "$APP_NAME" >/dev/null 2>&1 || true
  exit "$status"
}

trap cleanup EXIT

mkdir -p "$RELEASES_DIR"
test -f "$ENV_FILE"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$RELEASE_DIR"

if [ -n "$NEW_ENV_FILE" ]; then
  test -f "$NEW_ENV_FILE"
  ENV_BACKUP="$(mktemp "/tmp/${APP_NAME}.env.backup.XXXXXX")"
  cp "$ENV_FILE" "$ENV_BACKUP"
  install -o root -g root -m 600 "$NEW_ENV_FILE" "$ENV_FILE"
fi

cd "$RELEASE_DIR"
node scripts/validate-release.mjs "$RELEASE_DIR"
set -a
. "$ENV_FILE"
set +a

DATABASE_DIR="$(dirname "${DATABASE_PATH:-/var/lib/bakery_ecom/bakery.sqlite}")"
UPLOADS_RUNTIME_DIR="${UPLOADS_DIR:-/var/lib/bakery_ecom/uploads}"

export npm_config_fund=false
export npm_config_audit=false
npm ci --omit=dev

mkdir -p "$DATABASE_DIR" "$UPLOADS_RUNTIME_DIR"
chown -R "$APP_USER:$APP_GROUP" "$RELEASE_DIR"
chown -R "$APP_USER:$APP_GROUP" "$DATABASE_DIR" "$UPLOADS_RUNTIME_DIR"

if command -v sudo >/dev/null 2>&1; then
  sudo -u "$APP_USER" env PATH="$PATH" NODE_ENV=production $(command -v node) scripts/validate-runtime.mjs
else
  node scripts/validate-runtime.mjs
fi

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
chown -h "$APP_USER:$APP_GROUP" "$CURRENT_LINK"
systemctl restart "$APP_NAME"

SUCCESS=1
echo "Release $RELEASE_ID activated"
