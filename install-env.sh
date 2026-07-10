#!/usr/bin/env bash
# AI Camp 环境安装脚本 (macOS / Linux)
# 仅完成依赖检查、环境配置与数据库初始化，不启动开发服务器。
# 安装完成后请运行: ./start-dev.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; NC=$'\033[0m'

log()   { echo "${BLUE}[install]${NC} $*"; }
ok()    { echo "${GREEN}[ok]${NC} $*"; }
warn()  { echo "${YELLOW}[warn]${NC} $*"; }
fail()  { echo "${RED}[fail]${NC} $*"; exit 1; }

echo ""
echo "${GREEN}========================================${NC}"
echo "${GREEN}  AI Camp 环境安装 (macOS / Linux)${NC}"
echo "${GREEN}========================================${NC}"
echo ""

# --- 1. Node.js ---
log "检查 Node.js..."
if ! command -v node >/dev/null 2>&1; then
  fail "未检测到 Node.js。请先安装 Node 18.18+：https://nodejs.org"
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
NODE_MINOR=$(node -p "process.versions.node.split('.')[1]")
if [ "$NODE_MAJOR" -lt 18 ] || { [ "$NODE_MAJOR" -eq 18 ] && [ "$NODE_MINOR" -lt 18 ]; }; then
  fail "Node 版本过低 ($(node -v))，需要 >= 18.18.0"
fi
ok "Node.js $(node -v)"

# --- 2. pnpm ---
log "检查 pnpm..."
if ! command -v pnpm >/dev/null 2>&1; then
  warn "未找到 pnpm，正在通过 corepack 安装..."
  corepack enable
  corepack prepare pnpm@9.12.0 --activate
fi
ok "pnpm $(pnpm -v)"

# --- 3. Docker (可选) ---
DC=""
if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
    ok "Docker Compose 已就绪"
  elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
    ok "docker-compose 已就绪"
  else
    warn "已安装 Docker 但未找到 compose 插件，PostgreSQL 容器将无法启动。"
  fi
else
  warn "未检测到 Docker。默认使用 SQLite，本地演示不受影响。"
  echo "         如需 PostgreSQL，请安装 Docker Desktop: https://www.docker.com"
fi

# --- 4. .env.local ---
if [ ! -f .env.local ]; then
  log "从 .env.example 创建 .env.local..."
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
  ok "已创建 .env.local（已写入本地开发用 ARK_API_KEY）"
else
  ok ".env.local 已存在，保持不变"
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

# --- 5. Docker Postgres (仅当 DATABASE_URL 为 PostgreSQL 时) ---
if [ -n "$DC" ] && [[ "${DATABASE_URL:-}" == postgresql* ]]; then
  log "启动 PostgreSQL 容器..."
  $DC up -d postgres || warn "PostgreSQL 容器启动失败，请检查 docker-compose.yml"
else
  warn "使用 SQLite（${DATABASE_URL:-file:./prisma/dev.db}），跳过 Postgres 容器"
fi

# --- 6. 安装依赖 ---
log "安装 pnpm 工作区依赖（首次可能需数分钟）..."
pnpm install --prefer-frozen-lockfile=false
ok "依赖安装完成"

# --- 7. 数据库 ---
log "初始化数据库（prisma generate + db push + seed）..."
pnpm --filter @ai-camp/api exec prisma generate
pnpm --filter @ai-camp/api exec prisma db push --accept-data-loss
pnpm --filter @ai-camp/api db:seed || warn "种子数据脚本有告警（可继续）"
ok "数据库就绪"

echo ""
echo "${GREEN}========================================${NC}"
echo "${GREEN}  环境安装完成！${NC}"
echo "${GREEN}========================================${NC}"
echo ""
echo "  下一步：启动开发服务器"
echo "    ./start-dev.sh"
echo ""
echo "  或手动启动："
echo "    pnpm dev"
echo ""
echo "  访问地址："
echo "    Web  : http://localhost:${WEB_PORT:-3000}"
echo "    API  : http://localhost:${API_PORT:-3001}/api"
echo "    Docs : http://localhost:${API_PORT:-3001}/api/docs"
echo ""
echo "  演示账号（密码均为 123456）："
echo "    admin / teacher1 / parent1 / alice / bob"
echo ""
