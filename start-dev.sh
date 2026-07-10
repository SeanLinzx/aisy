#!/usr/bin/env bash
# Local development launcher for the AI Camp platform (macOS / Linux).
# Idempotent: safe to run multiple times.
# Default path: SQLite (Docker optional for PostgreSQL).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; NC=$'\033[0m'

log()   { echo "${BLUE}[ai-camp]${NC} $*"; }
ok()    { echo "${GREEN}[ok]${NC} $*"; }
warn()  { echo "${YELLOW}[warn]${NC} $*"; }
fail()  { echo "${RED}[fail]${NC} $*"; exit 1; }

log "Checking runtime dependencies..."
command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Please install Node 18.18+."
command -v pnpm >/dev/null 2>&1 || {
  warn "pnpm not found. Installing via corepack..."
  corepack enable && corepack prepare pnpm@9.12.0 --activate
}
ok "Node / pnpm OK."

DC=""
if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
  fi
fi

# --- Generate .env.local for developer convenience ---
if [ ! -f .env.local ]; then
  log "Creating .env.local for local dev..."
  cp .env.example .env.local
  if ! grep -q "^ARK_API_KEY=.\+$" .env.local; then
    if [ -n "${ARK_API_KEY_DEV:-}" ]; then
      DEV_KEY="$ARK_API_KEY_DEV"
    else
      DEV_KEY="ark-122144da-3d4a-41d7-9b8b-8bffb454b6f8-49fe4"
    fi
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s#^ARK_API_KEY=.*#ARK_API_KEY=${DEV_KEY}#" .env.local
    else
      sed -i "s#^ARK_API_KEY=.*#ARK_API_KEY=${DEV_KEY}#" .env.local
    fi
  fi
  ok "Created .env.local (ARK_API_KEY injected for local dev)."
else
  ok ".env.local already exists, leaving untouched."
fi

# Export env vars from .env.local so child processes inherit them
set -a
# shellcheck disable=SC1091
source .env.local
set +a

if [ -z "${ARK_API_KEY:-}" ]; then
  warn "ARK_API_KEY is empty → system will fall back to MockProvider."
else
  ok "ARK_API_KEY detected → VolcengineArkProvider will be used when enabled."
fi

# --- Optional: Postgres via Docker (when DATABASE_URL is PostgreSQL) ---
if [ -n "$DC" ]; then
  if [[ "${DATABASE_URL:-}" == postgresql* ]]; then
    log "Starting Docker service (PostgreSQL)..."
    $DC up -d postgres || warn "Could not start docker Postgres (compose may not define postgres)."
    ok "Docker infra step done."
  else
    warn "Using SQLite (${DATABASE_URL:-file:./prisma/dev.db}) — skipping Postgres container."
  fi
else
  warn "Docker not found — using SQLite only. Fine for local demos."
fi

# --- Install dependencies ---
log "Installing pnpm workspace dependencies (first run may take a while)..."
pnpm install --prefer-frozen-lockfile=false
ok "Dependencies installed."

# --- Prisma: generate client, push schema, seed ---
log "Applying database schema (prisma db push) and seeding demo data..."
pnpm --filter @ai-camp/api exec prisma generate
pnpm --filter @ai-camp/api exec prisma db push --accept-data-loss
pnpm --filter @ai-camp/api db:seed || warn "Seed script reported an issue (continuing)."
ok "Database ready."

# --- Launch dev servers ---
log "Launching API (http://localhost:${API_PORT:-3001}) and Web (http://localhost:${WEB_PORT:-3000})..."
echo
echo "${GREEN}=====================================${NC}"
echo "${GREEN} AI Camp dev servers starting!${NC}"
echo "${GREEN}-------------------------------------${NC}"
echo " Web  : http://localhost:${WEB_PORT:-3000}"
echo " API  : http://localhost:${API_PORT:-3001}/api"
echo " Docs : http://localhost:${API_PORT:-3001}/api/docs"
echo ""
echo " Demo accounts (password for all = 123456):"
echo "   admin    / 123456"
echo "   teacher1 / 123456"
echo "   parent1  / 123456"
echo "   alice    / 123456   (student)"
echo "   bob      / 123456   (student)"
echo "${GREEN}=====================================${NC}"
echo

exec pnpm dev
