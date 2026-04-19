#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/bakery_ecom}"
SETS_DIR="$BACKUP_DIR/sets"
DAILY_RETENTION="${DAILY_RETENTION:-14}"
WEEKLY_RETENTION="${WEEKLY_RETENTION:-8}"
MONTHLY_RETENTION="${MONTHLY_RETENTION:-3}"
NOW_EPOCH="$(date -u +%s)"

mkdir -p "$SETS_DIR"

mapfile -t backup_sets < <(find "$SETS_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)

if [ "${#backup_sets[@]}" -eq 0 ]; then
  echo "No backup sets to prune"
  exit 0
fi

declare -A keep_set=()
declare -A kept_weeks=()
declare -A kept_months=()
weekly_kept=0
monthly_kept=0

for backup_name in "${backup_sets[@]}"; do
  if [[ ! "$backup_name" =~ ^([0-9]{8})-([0-9]{6})$ ]]; then
    keep_set["$backup_name"]=1
    continue
  fi

  backup_date="${BASH_REMATCH[1]}"
  backup_time="${BASH_REMATCH[2]}"
  backup_epoch="$(date -u -d "${backup_date:0:4}-${backup_date:4:2}-${backup_date:6:2} ${backup_time:0:2}:${backup_time:2:2}:${backup_time:4:2}" +%s)"
  age_days="$(( (NOW_EPOCH - backup_epoch) / 86400 ))"
  week_key="$(date -u -d "${backup_date:0:4}-${backup_date:4:2}-${backup_date:6:2}" +%G-%V)"
  month_key="$(date -u -d "${backup_date:0:4}-${backup_date:4:2}-${backup_date:6:2}" +%Y-%m)"

  if [ "$age_days" -lt "$DAILY_RETENTION" ]; then
    keep_set["$backup_name"]=1
    continue
  fi

  if [ "$weekly_kept" -lt "$WEEKLY_RETENTION" ] && [ -z "${kept_weeks[$week_key]:-}" ]; then
    keep_set["$backup_name"]=1
    kept_weeks["$week_key"]=1
    weekly_kept=$((weekly_kept + 1))
    continue
  fi

  if [ "$monthly_kept" -lt "$MONTHLY_RETENTION" ] && [ -z "${kept_months[$month_key]:-}" ]; then
    keep_set["$backup_name"]=1
    kept_months["$month_key"]=1
    monthly_kept=$((monthly_kept + 1))
    continue
  fi
done

pruned=0
for backup_name in "${backup_sets[@]}"; do
  if [ -n "${keep_set[$backup_name]:-}" ]; then
    continue
  fi
  rm -rf "$SETS_DIR/$backup_name"
  pruned=$((pruned + 1))
done

echo "Pruned $pruned backup set(s)"
