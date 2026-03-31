#!/usr/bin/env bash
set -euo pipefail

echo "[startup] Preparing Azure runtime for Chrome-based invoice generation"

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive

  apt_get_cmd=""
  if [ "$(id -u)" -eq 0 ]; then
    apt_get_cmd="apt-get"
  elif command -v sudo >/dev/null 2>&1; then
    apt_get_cmd="sudo apt-get"
  fi

  if [ -n "$apt_get_cmd" ]; then
    $apt_get_cmd update
    $apt_get_cmd install -y \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libpangocairo-1.0-0 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2
  else
    echo "[startup] apt-get is available but cannot be elevated; skipping native library install"
  fi
else
  echo "[startup] apt-get not available; skipping native library install"
fi

echo "[startup] Starting Next.js standalone server"
exec node server.js
