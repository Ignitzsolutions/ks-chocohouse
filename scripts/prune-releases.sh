#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bakery_ecom}"
RELEASES_DIR="$APP_ROOT/releases"
KEEP_RELEASES="${KEEP_RELEASES:-3}"

mkdir -p "$RELEASES_DIR"
mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [ "${#releases[@]}" -le "$KEEP_RELEASES" ]; then
  echo "No releases to prune"
  exit 0
fi

for release in "${releases[@]:0:${#releases[@]}-KEEP_RELEASES}"; do
  rm -rf "$release"
done

echo "Pruned old releases"
