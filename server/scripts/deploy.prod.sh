#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo "[deploy] missing .env in $ROOT_DIR"
  echo "[deploy] run: cp .env.aliyun.example .env"
  exit 1
fi

echo "[deploy] installing dependencies"
npm ci

echo "[deploy] type checking"
npm run typecheck

echo "[deploy] building"
npm run build

echo "[deploy] pruning dev dependencies"
npm prune --omit=dev

if command -v pm2 >/dev/null 2>&1; then
  PM2_BIN=(pm2)
else
  PM2_BIN=(npx --yes pm2@latest)
fi

echo "[deploy] reloading process with PM2"
"${PM2_BIN[@]}" startOrReload ecosystem.config.cjs --env production

echo "[deploy] saving PM2 process list"
"${PM2_BIN[@]}" save

echo "[deploy] current status"
"${PM2_BIN[@]}" status shaobuqi-server

echo "[deploy] done"
