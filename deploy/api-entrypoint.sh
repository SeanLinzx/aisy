#!/bin/sh
# API 容器启动脚本：保证 SQLite 数据库持久化在挂载卷上。
# - 首次启动：用构建时生成的种子库初始化（含默认账号）
# - 后续升级：保留数据，尝试用 prisma db push 同步新 schema
set -e

DB_FILE="${DB_FILE:-/app/db/prod.db}"
DB_DIR="$(dirname "$DB_FILE")"
mkdir -p "$DB_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "[entrypoint] $DB_FILE 不存在，用种子库初始化"
  cp /app/prisma/seed-template.db "$DB_FILE"
else
  echo "[entrypoint] 复用已有数据库 $DB_FILE"
fi

if command -v prisma >/dev/null 2>&1; then
  echo "[entrypoint] 同步 Prisma schema"
  prisma db push --schema /app/prisma/schema.prisma --skip-generate \
    || echo "[entrypoint] schema push 失败（可能包含破坏性变更），继续以现有结构启动"
fi

if [ -f /app/scripts/upsert-sensitive-words.js ]; then
  echo "[entrypoint] 同步基础敏感词"
  node /app/scripts/upsert-sensitive-words.js \
    || echo "[entrypoint] 敏感词同步失败，继续启动"
fi

exec node dist/src/main.js
