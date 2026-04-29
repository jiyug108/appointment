# --- 第一阶段：构建阶段 ---
FROM node:22-bullseye AS builder

WORKDIR /app

# 安装构建 better-sqlite3 所需的基础工具
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 先复制 package.json 以利用 Docker 缓存
COPY package*.json ./
RUN npm install

# 复制整个项目并构建前端
COPY . .
RUN npm run build

# --- 第二阶段：运行阶段 ---
FROM node:22-bullseye-slim

WORKDIR /app

# 从构建阶段复制必要的文件
# 包含运行时所需的 node_modules 和构建好的前端 dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
# 如果您有其他公共资源文件夹，也需要复制
COPY --from=builder /app/public ./public 2>/dev/null || true

# 设置环境变量
ENV NODE_ENV=production
# 应用监听的端口（固定为 3000）
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动程序
# 使用 npx tsx 运行服务器，或者直接使用 node（Node 22+ 特性）
CMD ["npx", "tsx", "server.ts"]
