#!/usr/bin/env bash
# One-shot docker compose launcher.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[fail] Docker not installed."; exit 1
fi
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[ok] Created .env from .env.example (edit it to add your ARK_API_KEY for real AI)."
fi

set -a; source .env; set +a

echo "[ai-camp] Building and starting all services..."
$DC --env-file .env up -d --build

echo
echo "====================================="
echo " AI Camp running via Docker!"
echo " Web : http://localhost:3000"
echo " API : http://localhost:3001/api"
echo " Docs: http://localhost:3001/api/docs"
echo " Demo accounts (pwd=123456): admin / teacher1 / parent1 / alice / bob"
echo "====================================="
