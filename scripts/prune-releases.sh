#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bakery_ecom}"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="${CURRENT_LINK:-$APP_ROOT/current}"
KEEP_RELEASES="${KEEP_RELEASES:-4}"
PRUNE_MIN_AGE_MINUTES="${PRUNE_MIN_AGE_MINUTES:-1440}"

mkdir -p "$RELEASES_DIR"
current_release="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
now_epoch="$(date -u +%s)"
mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk '{print $2}')

if [ "${#releases[@]}" -le "$KEEP_RELEASES" ]; then
  echo "No releases to prune"
  exit 0
fi

declare -a prune_candidates=()
kept_non_current=0

for release in "${releases[@]}"; do
  if [ -n "$current_release" ] && [ "$release" = "$current_release" ]; then
    continue
  fi

  release_mtime="$(stat -c %Y "$release")"
  age_minutes="$(( (now_epoch - release_mtime) / 60 ))"

  if [ "$age_minutes" -lt "$PRUNE_MIN_AGE_MINUTES" ]; then
    continue
  fi

  if [ "$kept_non_current" -lt "$KEEP_RELEASES" ]; then
    kept_non_current=$((kept_non_current + 1))
    continue
  fi

  prune_candidates+=("$release")
done

if [ "${#prune_candidates[@]}" -eq 0 ]; then
  echo "No releases to prune"
  exit 0
fi

for release in "${prune_candidates[@]}"; do
  rm -rf "$release"
done

echo "Pruned ${#prune_candidates[@]} old release(s)"
