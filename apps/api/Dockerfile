# Build stage
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages packages
RUN pnpm install --filter @ai-camp/api... --frozen-lockfile=false

COPY apps/api apps/api
WORKDIR /workspace/apps/api
ENV DATABASE_URL=file:./prod.db
RUN pnpm exec prisma generate
RUN pnpm exec prisma db push --accept-data-loss
RUN pnpm exec tsx prisma/seed.ts
RUN pnpm build

WORKDIR /workspace
RUN pnpm deploy --filter @ai-camp/api --prod /prod/api
RUN cp apps/api/prisma/prod.db /prod/api/prisma/prod.db
RUN GEN=$(find /workspace/node_modules/.pnpm -type d -path '*/node_modules/.prisma' | head -1) && \
    DEST=$(find /prod/api/node_modules/.pnpm -type d -path '*/@prisma+client*/node_modules' | head -1) && \
    cp -r "$GEN" "$DEST/"

# Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# 数据库放在挂载卷 /app/db 下，重建容器不丢数据（见 deploy/api-entrypoint.sh）
ENV DATABASE_URL=file:/app/db/prod.db
ENV DB_FILE=/app/db/prod.db

RUN apk add --no-cache openssl
RUN npm install -g prisma@5.22.0

COPY --from=builder /prod/api ./
# 构建期生成的种子库仅作为首次启动的初始化模板
RUN mv /app/prisma/prod.db /app/prisma/seed-template.db
COPY deploy/api-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3001
CMD ["/app/entrypoint.sh"]
