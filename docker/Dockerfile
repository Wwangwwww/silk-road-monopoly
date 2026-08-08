# ==================== Build Stage ====================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

WORKDIR /app

# 复制依赖配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/env/package.json ./packages/env/
COPY packages/types/package.json ./packages/types/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

# 构建 @silk-road-monopoly/env
COPY packages/env/ ./packages/env/
RUN pnpm --filter @silk-road-monopoly/env build

# 复制源代码
COPY packages/types/ ./packages/types/
COPY apps/server/ ./apps/server/

# 创建独立部署包
RUN pnpm --filter @silk-road-monopoly/server deploy --legacy /app/deploy

# esbuild 打包服务端
RUN npm install -g esbuild && \
    npx esbuild /app/deploy/app.ts \
    --bundle --platform=node --format=esm \
    --packages=external \
    --outfile=/app/deploy/server.js

# 构建 Admin 前端
ARG MAP_ENCRYPT_KEY
ARG PROTOCOL
ARG SILKROAD_DOMAIN
ARG SERVER_PORT
ARG API_BASE_PREFIX
ARG ADMIN_BASE_PREFIX
ENV MAP_ENCRYPT_KEY=${MAP_ENCRYPT_KEY} \
    PROTOCOL=${PROTOCOL} \
    SILKROAD_DOMAIN=${SILKROAD_DOMAIN} \
    SERVER_PORT=${SERVER_PORT} \
    API_BASE_PREFIX=${API_BASE_PREFIX} \
    ADMIN_BASE_PREFIX=${ADMIN_BASE_PREFIX}

COPY packages/utils/package.json ./packages/utils/
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile

COPY packages/utils/ ./packages/utils/
COPY apps/admin/ ./apps/admin/
RUN pnpm --filter @silk-road-monopoly/admin build

# ==================== Runtime Stage ====================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# 复制部署的 node_modules
COPY --from=builder /app/deploy/node_modules ./node_modules

# 复制打包输出
COPY --from=builder /app/deploy/server.js ./server.js

# 复制公共文件 (头像、地图、日志等)
COPY --from=builder /app/apps/server/public ./public

# 复制 Admin 前端构建输出
COPY --from=builder /app/apps/admin/dist ./admin-dist

EXPOSE 8081 8082 8083

CMD ["node", "server.js"]
