# 使用 Node.js 20 官方镜像作为基础 (非 slim 版本包含构建工具)
FROM node:20 as builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源代码并构建
COPY . .
RUN npm run build

# 运行环境使用 slim 节省空间，但需要确保 native 模块能运行
FROM node:20-slim

# 安装运行 better-sqlite3 可能需要的库 (通常 slim 版缺少这些)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 只需要生产环境依赖
COPY package*.json ./
RUN npm install --omit=dev

# 从构建阶段复制打包好的文件和 server.ts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./

# 安装 tsx 用于运行 server.ts
RUN npm install -g tsx

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["tsx", "server.ts"]
