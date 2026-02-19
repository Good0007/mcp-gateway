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

# 安装必要的系统依赖和运行时工具
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    python3 \
    py3-pip \
    curl \
    go \
    rust \
    cargo \
    bash \
    git

# 安装 bun (用于安装依赖)
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# 安装 uv (Python 包管理器，包含 uvx)
RUN pip3 install --no-cache-dir uv --break-system-packages

# 设置时区
ENV TZ=Asia/Shanghai

# 设置 Python 别名（确保 python 命令可用）
RUN ln -sf /usr/bin/python3 /usr/local/bin/python

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 从构建阶段复制必要文件
# 1. 复制根目录的 package.json（包含 workspaces 配置）
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# 2. 复制 shared 包（编译产物）
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist

# 3. 复制 core 包（编译产物）
COPY --from=builder --chown=nodejs:nodejs /app/packages/core/package.json ./packages/core/
COPY --from=builder --chown=nodejs:nodejs /app/packages/core/dist ./packages/core/dist

# 4. 复制 server 包（编译产物 + 静态文件）
COPY --from=builder --chown=nodejs:nodejs /app/packages/server/package.json ./packages/server/
COPY --from=builder --chown=nodejs:nodejs /app/packages/server/dist ./packages/server/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/server/public ./packages/server/public

# 安装生产依赖（仅 dependencies，不包含 devDependencies）
# 不复制 lock 文件，让 bun 根据 package.json 重新生成
RUN bun install --production

# 验证运行时工具（调试用，可选）
RUN echo "=== 验证运行时工具 ===" && \
    node --version && \
    npm --version && \
    npx --version && \
    go version && \
    rustc --version && \
    cargo --version && \
    bun --version && \
    python3 --version && \
    uv --version && \
    echo "✅ 所有工具已就绪"

# 创建必要的目录并设置权限
RUN mkdir -p /app/config /app/data /app/logs && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Python 和工具路径
ENV PATH="/usr/local/bin:$PATH"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "packages/server/dist/index.js"]
