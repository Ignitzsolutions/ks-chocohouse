#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <previous-release-path>"
  exit 1
fi

APP_NAME="${APP_NAME:-bakery_ecom}"
APP_ROOT="${APP_ROOT:-/var/www/bakery_ecom}"
CURRENT_LINK="$APP_ROOT/current"
PREVIOUS_RELEASE="$1"

test -d "$PREVIOUS_RELEASE"
ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
systemctl restart "$APP_NAME"

echo "Rolled back to $PREVIOUS_RELEASE"
