# ===================================
# MCP Agent - Docker 多阶段构建
# ===================================
# 
# 运行时工具清单:
#   - Node.js 24 (LTS)
#   - Bun (包管理器和运行时)
#   - Python 3.11+
#   - uv/uvx (Python 包管理器)
#   - Go (编译型语言)
#   - Rust (编译型语言)
#
# 镜像大小: ~500MB
# ===================================

# ===================================
# Stage 1: 构建阶段 (Build Stage)
# ===================================
FROM oven/bun:1.3-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/core/package.json ./packages/core/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/

# 安装所有依赖（包括 devDependencies，用于构建）
RUN bun install

# 复制所有源代码
COPY . .

# 构建所有包（按正确的依赖顺序）
RUN bun run build:full

# 验证构建产物
RUN ls -la packages/server/dist/ && \
    ls -la packages/server/public/ || echo "Warning: public directory not found"

# ===================================
# Stage 2: 生产阶段 (Production Stage)
# ===================================
FROM node:24-alpine AS production
# 替换国内源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
# 安装必要的系统依赖和运行时工具
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    python3 \
    py3-pip \
    curl \
    bash \
    git \
    unzip

# 从构建阶段复制 bun（更可靠，避免安装脚本问题）
# 在 oven/bun 镜像中，bun 位于 /usr/local/bin/
COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun
COPY --from=builder /usr/local/bin/bunx /usr/local/bin/bunx

# 验证 bun 是否可用
RUN bun --version

# 安装 uv (Python 包管理器，包含 uvx)
RUN pip3 install --no-cache-dir uv --break-system-packages

# 设置时区
ENV TZ=Asia/Shanghai

# 设置 Python 别名（确保 python 命令可用）
RUN ln -sf /usr/bin/python3 /usr/local/bin/python

# 注意：以 root 运行以支持动态安装运行时环境（apk add 等命令）
# 这是开发工具，用于可信环境，安全边界在容器层面

WORKDIR /app

# 从构建阶段复制必要文件
# 1. 复制根目录的 package.json 和 lock 文件（包含 workspaces 配置）
COPY --from=builder /app/package.json ./

# 2. 复制 shared 包（编译产物）
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# 3. 复制 core 包（编译产物）
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/core/dist ./packages/core/dist

# 4. 复制 server 包（编译产物 + 静态文件）
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/public ./packages/server/public

# 安装生产依赖（仅 dependencies，不包含 devDependencies）
# 使用 lock 文件确保与构建阶段版本一致
RUN bun install --production

# 验证运行时工具（调试用，可选）
RUN echo "=== 验证运行时工具 ===" && \
    node --version && \
    npm --version && \
    npx --version && \
    bun --version && \
    python3 --version && \
    uv --version && \
    echo "✅ 所有工具已就绪"

# 创建必要的目录
RUN mkdir -p /app/config /app/data /app/logs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV MCP_AGENT_AUTH=true
ENV MCP_AGENT_USERNAME=admin
ENV MCP_AGENT_PASSWORD=admin123
# Python 和工具路径
ENV PATH="/usr/local/bin:$PATH"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "packages/server/dist/index.js"]
