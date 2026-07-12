#!/usr/bin/env bash
# 部署到 122 服务器 (122.51.185.212)
# 用法:
#   ./deploy-prod.sh                                    # 需已配置 SSH 密钥
#   SSHPASS='你的密码' ./deploy-prod.sh                  # 密码登录（sshpass）
#   DEPLOY_NGINX=1 SSHPASS='...' ./deploy-prod.sh       # 同时更新 Nginx
set -euo pipefail

REMOTE="${REMOTE:-root@122.51.185.212}"
REMOTE_DIR="${REMOTE_DIR:-/opt/ai-camp}"
SSH_PORT="${SSH_PORT:-22}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

# 有 SSHPASS 时用 sshpass 包装 ssh/rsync/scp
if [[ -n "${SSHPASS:-}" ]]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "错误: 设置了 SSHPASS 但未安装 sshpass（brew install sshpass）" >&2
    exit 1
  fi
  SSH_WRAP=(sshpass -e ssh -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)
  RSYNC_SSH="sshpass -e ssh -p $SSH_PORT -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no"
  SCP_WRAP=(sshpass -e scp -P "$SSH_PORT" -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)
else
  SSH_WRAP=(ssh -p "$SSH_PORT")
  RSYNC_SSH="ssh -p $SSH_PORT"
  SCP_WRAP=(scp -P "$SSH_PORT")
fi

echo "==> 同步代码到 ${REMOTE}:${REMOTE_DIR}"
rsync -avz --delete -e "$RSYNC_SSH" \
  --exclude node_modules \
  --exclude .next \
  --exclude dist \
  --exclude data \
  --exclude apps/api/uploads \
  --exclude 'apps/api/prisma/*.db*' \
  --exclude .env.local \
  --exclude .env \
  --exclude '.DS_Store' \
  --exclude '*.pptx' \
  --exclude '*.pdf' \
  --exclude .git \
  "${ROOT}/" "${REMOTE}:${REMOTE_DIR}/"

echo "==> 迁移旧容器内的数据库到持久化卷（仅首次，之后为空操作）"
"${SSH_WRAP[@]}" "${REMOTE}" "cd '${REMOTE_DIR}' && mkdir -p data/db data/uploads && \
  if [ ! -f data/db/prod.db ] && [ -n \"\$(docker ps -q -f name=ai-camp-api)\" ]; then \
    docker cp ai-camp-api:/app/prisma/prod.db data/db/prod.db 2>/dev/null && echo '已从旧容器导出数据库' || echo '旧容器无数据库（跳过）'; \
  fi"

echo "==> 远程构建并重启容器"
"${SSH_WRAP[@]}" "${REMOTE}" "cd '${REMOTE_DIR}' && docker compose -f docker-compose.prod.yml up -d --build"

if [[ "${DEPLOY_NGINX:-0}" == "1" ]]; then
  echo "==> 更新 Nginx 配置并 reload"
  "${SSH_WRAP[@]}" "${REMOTE}" "cat > /etc/nginx/conf.d/ai-camp.conf" < "${ROOT}/deploy/nginx-ip.conf"
  "${SSH_WRAP[@]}" "${REMOTE}" "nginx -t && nginx -s reload"
fi

echo "==> 健康检查"
sleep 8
"${SSH_WRAP[@]}" "${REMOTE}" "curl -sf http://127.0.0.1:3014/api/health && echo ' [api ok]' || echo ' [api FAILED]'"
"${SSH_WRAP[@]}" "${REMOTE}" "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:3013/aisy/ && echo ' [web ok]' || echo ' [web FAILED]'"
"${SSH_WRAP[@]}" "${REMOTE}" "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:3015/aisy_pad/ && echo ' [web-pad ok]' || echo ' [web-pad FAILED]'"

echo "==> 完成。桌面版: http://122.51.185.212/aisy  |  平板版: http://122.51.185.212/aisy_pad"
