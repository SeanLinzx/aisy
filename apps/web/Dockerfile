FROM node:20-alpine AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages packages
RUN pnpm install --filter @ai-camp/web... --frozen-lockfile=false

COPY apps/web apps/web
WORKDIR /workspace/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_PAD_MODE=0
ARG API_ORIGIN=http://localhost:3001
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_PAD_MODE=$NEXT_PUBLIC_PAD_MODE
ENV API_ORIGIN=$API_ORIGIN
RUN pnpm build

WORKDIR /workspace
RUN pnpm deploy --filter @ai-camp/web --prod /prod/web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /prod/web ./

EXPOSE 3000
CMD ["sh", "-c", "node node_modules/next/dist/bin/next start -p 3000"]
