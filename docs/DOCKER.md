# Docker 部署指南

使用 Docker 快速部署 MCP Agent 到生产环境。

## 📋 目录

- [快速开始](#快速开始)
- [使用公共镜像](#使用公共镜像)
- [配置说明](#配置说明)
- [常用命令](#常用命令)
- [多平台构建](#多平台构建)
- [故障排查](#故障排查)

---

## 🚀 快速开始

### 使用 Docker Compose（推荐）

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问 Web 界面
open http://localhost:3000
```

### 使用 Docker 命令

```bash
# 构建镜像
docker build -t mcp-agent:latest .

# 运行容器
docker run -d -p 3000:3000 --name mcp-agent mcp-agent:latest

# 查看日志
docker logs -f mcp-agent
```

---

## 🐳 使用公共镜像

直接使用 Docker Hub 上的官方镜像：

```bash
# AMD64 或 ARM64 架构
docker run -d -p 3000:3000 kangkang223/mcp-agent:latest

# 使用 Docker Compose
services:
  mcp-agent:
    image: kangkang223/mcp-agent:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

详细使用说明：[Docker Hub README](../DOCKER_HUB_README.md)

---

## ⚙️ 配置说明

### 环境变量

在 `docker-compose.yml` 中配置：

```yaml
services:
  mcp-agent:
    environment:
      # 运行环境
      - NODE_ENV=production
      
      # 登录认证（可选）
      - MCP_AGENT_AUTH_ENABLE=true
      - MCP_AGENT_USERNAME=admin
      - MCP_AGENT_PASSWORD=your_secure_password
```

### 数据持久化

```yaml
services:
  mcp-agent:
    volumes:
      # 配置文件
      - ./config:/app/config
      # 数据目录
      - ./data:/app/data
      # 日志目录
      - ./logs:/app/logs
```

### 端口映射

```yaml
services:
  mcp-agent:
    ports:
      - "3000:3000"  # Web 界面和 API
```

---

## 📦 常用命令

### 基本操作

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec mcp-agent sh
```

### 使用 Makefile（推荐）

```bash
make up          # 启动服务
make down        # 停止服务
make logs        # 查看日志
make restart     # 重启服务
make shell       # 进入容器
make build       # 构建镜像
```

---

## 🔨 多平台构建

项目支持 AMD64 和 ARM64 两种架构的镜像构建（适用于 Apple Silicon 和 ARM 服务器）。

### 启用 Buildx

```bash
# 检查 Buildx 是否可用
make check-buildx

# 设置 Buildx（首次使用）
make buildx-setup
```

### 构建多平台镜像

```bash
# 构建 AMD64 和 ARM64 镜像
make buildx-build

# 构建并推送到 Docker Hub
make buildx-push

# 构建单一架构（本地测试）
make buildx-load-amd64   # AMD64
make buildx-load-arm64   # ARM64
```

### 手动构建

```bash
# 创建 builder
docker buildx create --name multiarch-builder --use

# 构建多平台镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t kangkang223/mcp-agent:latest \
  --push \
  .
```

---

## 🐛 故障排查

### 1. 构建失败

```bash
# 清理缓存重新构建
docker-compose build --no-cache

# 检查 bun.lock 文件
ls -la bun.lock*
```

### 2. 容器启动失败

```bash
# 查看容器日志
docker-compose logs mcp-agent

# 检查端口占用
lsof -i :3000
```

### 3. 前端页面 404

```bash
# 进入容器检查静态文件
docker-compose exec mcp-agent sh
ls -la /app/packages/server/public/

# 如果目录为空，重新构建
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

### 4. 权限问题

```bash
# 以 root 用户进入容器
docker-compose exec -u root mcp-agent sh

# 修复权限
chown -R node:node /app
```

### 5. 网络问题

```bash
# 测试网络连接
docker-compose exec mcp-agent ping google.com

# 检查 DNS
docker-compose exec mcp-agent nslookup google.com
```

---

## 📚 参考资源

- [Dockerfile 最佳实践](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Docker Buildx 文档](https://docs.docker.com/buildx/working-with-buildx/)
- [项目 Docker Hub](https://hub.docker.com/r/kangkang223/mcp-agent)

---

## 💡 提示

- **开发环境**：推荐使用本地模式（`bun run dev`），Docker 主要用于生产部署
- **镜像大小**：生产镜像约 300-400MB（Alpine 基础镜像）
- **安全性**：生产环境务必配置 `MCP_AGENT_AUTH_*` 认证
- **性能**：多阶段构建确保生产镜像只包含必要文件
