# Docker 部署指南

本文档介绍如何使用 Docker 部署 MCP Agent 项目。

## 📋 目录

- [快速开始](#快速开始)
- [构建配置](#构建配置)
- [运行配置](#运行配置)
- [常用命令](#常用命令)
- [故障排查](#故障排查)

---

## 🚀 快速开始

### 方式 1: 使用 Docker Compose（推荐）

```bash
# 1. 构建并启动服务
docker-compose up -d

# 2. 查看日志
docker-compose logs -f

# 3. 访问应用
open http://localhost:3000
```

### 方式 2: 使用 Docker 命令

```bash
# 1. 构建镜像
docker build -t mcp-agent:latest .

# 2. 运行容器
docker run -d \
  --name mcp-agent \
  -p 3000:3000 \
  -e NODE_ENV=production \
  mcp-agent:latest

# 3. 查看日志
docker logs -f mcp-agent

# 4. 访问应用
open http://localhost:3000
```

---

## 🏗️ 构建配置

### Dockerfile 架构

本项目使用**多阶段构建**优化镜像大小：

```
┌─────────────────────────────────────┐
│  Stage 1: Builder (oven/bun:alpine) │
│  - 安装所有依赖                       │
│  - 构建 TypeScript 代码               │
│  - 生成静态前端文件                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Stage 2: Production (node:22-alpine)│
│  - Node.js 22 LTS (包含 npm/npx)    │
│  - Python 3.11+ (系统运行时)         │
│  - uv/uvx (Python 包管理器)          │
│  - 仅复制编译产物                     │
│  - 安装生产依赖                       │
│  - 优化镜像大小 (~300MB)             │
└─────────────────────────────────────┘
```

### 运行时工具清单

生产镜像包含以下运行时工具：

| 工具 | 版本 | 说明 |
|------|------|------|
| **Node.js** | 22.x (LTS) | JavaScript 运行时 |
| **npm** | 10.x | Node 包管理器（自带） |
| **npx** | 10.x | 包执行器（自带） |
| **Python** | 3.11+ | Python 运行时 |
| **uv** | latest | 快速 Python 包管理器 |
| **uvx** | latest | Python 包执行器 |
| **pnpm** | latest | Node 包管理器（通过 corepack） |

**为什么需要这些工具？**
- **Node.js 22**: 最新 LTS，性能更好，安全漏洞更少
- **Python/uv**: 支持运行 Python 编写的 MCP 服务（如 `@modelcontextprotocol/server-*`）
- **npx/uvx**: 按需执行 MCP 服务，无需全局安装

### 构建顺序

项目按以下顺序构建（在 Dockerfile 中自动执行）：

1. **shared** - 共享类型定义
2. **core** - 核心引擎
3. **web** - 前端应用（Vite + React）
4. **server** - 后端服务（Hono）
5. **copy:web** - 复制前端静态文件到 server/public

### 自定义构建参数

```bash
# 指定不同的 Node.js 版本
docker build --build-arg NODE_VERSION=18 -t mcp-agent:node18 .

# 构建开发版本（如需要）
docker build --target builder -t mcp-agent:dev .
```

---

## ⚙️ 运行配置

### 环境变量

创建 `.env` 文件配置运行时参数：

```bash
# 复制示例配置
cp .env.docker .env

# 编辑配置
vim .env
```

**可用环境变量**：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3000` | 服务端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `MCP_SERVER_TOKEN` | - | MCP 代理认证 Token |

### 端口映射

默认映射：`3000:3000`（主机:容器）

自定义端口：

```bash
# Docker Compose
ports:
  - "8080:3000"  # 映射到主机 8080 端口

# Docker 命令
docker run -p 8080:3000 mcp-agent:latest
```

### 数据持久化

挂载卷以持久化数据：

```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data      # 配置文件
  - ./logs:/app/logs      # 日志文件
```

---

## 📦 常用命令

### 构建和运行

```bash
# 构建镜像
docker-compose build

# 启动服务（前台）
docker-compose up

# 启动服务（后台）
docker-compose up -d

# 重新构建并启动
docker-compose up -d --build

# 停止服务
docker-compose down

# 停止并删除卷
docker-compose down -v
```

### 查看状态

```bash
# 查看运行中的容器
docker-compose ps

# 查看日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f mcp-agent

# 查看最近 100 行日志
docker-compose logs --tail=100
```

### 进入容器

```bash
# 进入容器 shell
docker-compose exec mcp-agent sh

# 以 root 用户进入
docker-compose exec -u root mcp-agent sh

# 执行单个命令
docker-compose exec mcp-agent node --version
```

### 清理

```bash
# 停止并删除容器
docker-compose down

# 删除镜像
docker rmi mcp-agent:latest

# 清理所有未使用的资源
docker system prune -a

# 清理构建缓存
docker builder prune
```

---

## 🐛 故障排查

### 1. 构建失败

**问题**：`bun install` 或 `bun run build:full` 失败

**解决方案**：

```bash
# 清理缓存重新构建
docker-compose build --no-cache

# 检查 bun.lockb 是否存在
ls -la bun.lockb

# 本地测试构建
bun install
bun run build:full
```

### 2. 容器启动失败

**问题**：容器启动后立即退出

**解决方案**：

```bash
# 查看容器日志
docker-compose logs mcp-agent

# 检查端口是否被占用
lsof -i :3000

# 检查健康检查状态
docker inspect mcp-agent | grep -A 10 Health
```

### 3. 前端页面 404

**问题**：访问 http://localhost:3000 返回 404

**解决方案**：

```bash
# 进入容器检查静态文件
docker-compose exec mcp-agent sh
ls -la /app/packages/server/public/

# 如果 public 目录为空，重新构建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 4. 权限问题

**问题**：容器内文件权限错误

**解决方案**：

```bash
# 以 root 用户进入容器
docker-compose exec -u root mcp-agent sh

# 修复权限
chown -R nodejs:nodejs /app

# 重启容器
docker-compose restart
```

### 5. 网络问题

**问题**：无法访问外部服务或 MCP Server

**解决方案**：

```bash
# 检查容器网络
docker network ls
docker network inspect mcp-network

# 测试网络连接
docker-compose exec mcp-agent ping google.com

# 如果需要使用主机网络
docker run --network host mcp-agent:latest
```

---

## 🔧 高级配置

### 1. 反向代理（Nginx）

```nginx
server {
    listen 80;
    server_name mcp.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. HTTPS 支持（使用 Caddy）

```yaml
# docker-compose.yml
services:
  mcp-agent:
    # ... 现有配置 ...
    
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - mcp-network

volumes:
  caddy_data:
  caddy_config:
```

```caddy
# Caddyfile
mcp.example.com {
    reverse_proxy mcp-agent:3000
}
```

### 3. 资源限制

```yaml
# docker-compose.yml
services:
  mcp-agent:
    # ... 现有配置 ...
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## 📊 监控和日志

### 日志管理

```bash
# 配置日志驱动
# docker-compose.yml
services:
  mcp-agent:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 健康检查

容器内置健康检查，每 30 秒检查一次：

```bash
# 查看健康状态
docker inspect --format='{{json .State.Health}}' mcp-agent

# 手动触发健康检查
docker-compose exec mcp-agent node -e "require('http').get('http://localhost:3000/health', (r) => console.log(r.statusCode))"
```

---

## 📚 参考资源

- [Dockerfile 最佳实践](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Bun Docker 镜像](https://hub.docker.com/r/oven/bun)
- [Node.js Docker 镜像](https://hub.docker.com/_/node)

---

## 💡 提示

1. **开发环境**：推荐使用本地开发模式（`bun run dev`），Docker 主要用于生产部署
2. **镜像大小**：当前配置的生产镜像约 200-300MB（使用 Alpine 基础镜像）
3. **安全性**：生产环境建议配置 `MCP_SERVER_TOKEN` 进行认证
4. **性能**：多阶段构建确保生产镜像只包含必要文件，提升启动速度

---

## 🆘 获取帮助

遇到问题？

1. 查看 [docs/README.md](../docs/README.md) 了解项目架构
2. 查看 [Issues](https://github.com/your-repo/mcp-agent/issues)
3. 提交新的 Issue
