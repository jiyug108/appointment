# --- 第一阶段：构建阶段 ---
FROM node:22-bullseye AS builder

WORKDIR /app

# 安装构建 better-sqlite3 所需的基础工具
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY package*.json ./
RUN npm install

# 复制项目文件
COPY . .

# 构建前端产物
RUN npm run build

# --- 第二阶段：运行阶段 ---
FROM node:22-bullseye-slim

WORKDIR /app

# 安装 tsx 用于运行服务器
RUN npm install -g tsx

# 从构建阶段复制必要的文件
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/public ./public 2>/dev/null || true

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动程序
CMD ["tsx", "server.ts"]
