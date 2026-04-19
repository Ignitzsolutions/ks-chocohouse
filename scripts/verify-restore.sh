#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-http://127.0.0.1:3000}"
DATABASE_PATH="${DATABASE_PATH:-/var/lib/bakery_ecom/bakery.sqlite}"
MIN_ORDER_COUNT="${MIN_ORDER_COUNT:-0}"
KNOWN_ORDER_ID="${KNOWN_ORDER_ID:-}"
SAMPLE_UPLOAD_URL="${SAMPLE_UPLOAD_URL:-}"

curl -fsS "$SITE_URL/api/health" >/dev/null
curl -fsS "$SITE_URL/" >/dev/null
curl -fsS "$SITE_URL/admin/login" >/dev/null

order_count="$(sqlite3 "$DATABASE_PATH" 'SELECT COUNT(1) FROM orders;')"
if [ "${order_count:-0}" -lt "$MIN_ORDER_COUNT" ]; then
  echo "Order count check failed: expected at least $MIN_ORDER_COUNT, got ${order_count:-0}"
  exit 1
fi

if [ -n "$KNOWN_ORDER_ID" ]; then
  invoice_headers="$(mktemp)"
  curl -fsS -D "$invoice_headers" -o /dev/null "$SITE_URL/api/orders/$KNOWN_ORDER_ID/invoice"
  grep -qi '^content-type: application/pdf' "$invoice_headers"
  rm -f "$invoice_headers"
fi

if [ -n "$SAMPLE_UPLOAD_URL" ]; then
  curl -fsS "$SITE_URL$SAMPLE_UPLOAD_URL" >/dev/null
fi

echo "Restore verification passed"
