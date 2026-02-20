.PHONY: help build up down restart logs shell clean test buildx-setup buildx-build buildx-push

# 默认目标
help:
	@echo "Mcp Gateway - Docker 管理命令"
	@echo ""
	@echo "使用方式: make [target]"
	@echo ""
	@echo "可用命令:"
	@echo "  build           构建 Docker 镜像（当前平台）"
	@echo "  up              启动服务（后台模式）"
	@echo "  down            停止服务"
	@echo "  restart         重启服务"
	@echo "  logs            查看日志"
	@echo "  shell           进入容器 shell"
	@echo "  clean           清理所有容器和镜像"
	@echo "  test            测试容器是否正常运行"
	@echo ""
	@echo "多平台构建（需要 Docker 19.03+ 和 Buildx）:"
	@echo "  buildx-setup       初始化多平台构建环境"
	@echo "  buildx-build       构建多平台镜像（amd64 + arm64）"
	@echo "  buildx-push        构建并推送多平台镜像到 registry"
	@echo "  buildx-load-amd64  构建并加载 AMD64 镜像到本地"
	@echo "  buildx-load-arm64  构建并加载 ARM64 镜像到本地"
	@echo ""
	@echo "开发命令:"
	@echo "  dev           启动本地开发环境"
	@echo "  build-local   本地完整构建"
	@echo ""
	@echo "提示: 如果 buildx 不可用，使用 'make build' 构建当前平台镜像"
	@echo ""

# Docker 命令
build:
	@echo "🏗️  构建 Docker 镜像（当前平台）..."
	docker-compose build

# 多平台构建命令
check-buildx:
	@if ! docker buildx version >/dev/null 2>&1; then \
		echo "❌ 错误：Docker Buildx 不可用"; \
		echo ""; \
		echo "请升级到 Docker 19.03+ 或 Docker Desktop 最新版本"; \
		echo ""; \
		echo "检查方法："; \
		echo "  docker version"; \
		echo "  docker buildx version"; \
		echo ""; \
		echo "如果使用 Docker Desktop，请在设置中启用实验性功能"; \
		echo "如果使用 Docker CLI，请安装 buildx 插件"; \
		echo ""; \
		echo "替代方案：使用 'make build' 构建当前平台镜像"; \
		exit 1; \
	fi

buildx-setup: check-buildx
	@echo "🔧 初始化多平台构建环境..."
	@if ! docker buildx ls | grep -q mcp-builder; then \
		docker buildx create --name mcp-builder \
		--driver-opt env.http_proxy=http://192.168.5.2:7890 \
		--driver-opt env.https_proxy=http://192.168.5.2:7890 \
		 --driver docker-container --bootstrap; \
		echo "✅ 已创建 mcp-builder"; \
	else \
		echo "✅ mcp-builder 已存在"; \
	fi
	@docker buildx use mcp-builder
	@docker buildx inspect --bootstrap

buildx-build:
	@echo "🏗️  构建多平台镜像（linux/amd64, linux/arm64）..."
	@echo "⚠️  注意：多平台镜像无法直接加载到本地 Docker"
	@echo "📝 构建完成后需要使用 'make buildx-push' 推送到 registry"
	@if ! docker buildx ls | grep -q mcp-builder; then \
		echo "❌ 错误：buildx 环境未初始化"; \
		echo "请先运行：make buildx-setup"; \
		exit 1; \
	fi
	@docker buildx use mcp-builder
	@docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--tag mcp-gateway:latest \
		--tag mcp-gateway:$$(date +%Y%m%d) \
		-f Dockerfile \
		.
	@echo "✅ 多平台镜像构建完成"

buildx-push:
	@echo "🚀 构建并推送多平台镜像..."
	@if [ -z "$(REGISTRY)" ]; then \
		echo "❌ 错误：请设置 REGISTRY 变量"; \
		echo "用法：make buildx-push REGISTRY=your-username/mcp-gateway"; \
		exit 1; \
	fi
	@if ! docker buildx ls | grep -q mcp-builder; then \
		echo "❌ 错误：buildx 环境未初始化"; \
		echo "请先运行：make buildx-setup"; \
		exit 1; \
	fi
	@docker buildx use mcp-builder
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--tag $(REGISTRY):latest \
		--tag $(REGISTRY):$$(date +%Y%m%d) \
		--push \
		-f Dockerfile \
		.
	@echo "✅ 多平台镜像已推送到 $(REGISTRY)"

buildx-load-amd64:
	@echo "🏗️  构建并加载 AMD64 镜像到本地 Docker..."
	@if ! docker buildx ls | grep -q mcp-builder; then \
		echo "❌ 错误：buildx 环境未初始化"; \
		echo "请先运行：make buildx-setup"; \
		exit 1; \
	fi
	@docker buildx use mcp-builder
	docker buildx build \
		--platform linux/amd64 \
		--tag mcp-gateway:latest-amd64 \
		--load \
		-f Dockerfile \
		.
	@echo "✅ AMD64 镜像已加载到本地 Docker"

buildx-load-arm64:
	@echo "🏗️  构建并加载 ARM64 镜像到本地 Docker..."
	@if ! docker buildx ls | grep -q mcp-builder; then \
		echo "❌ 错误：buildx 环境未初始化"; \
		echo "请先运行：make buildx-setup"; \
		exit 1; \
	fi
	@docker buildx use mcp-builder
	docker buildx build \
		--platform linux/arm64 \
		--tag mcp-gateway:latest-arm64 \
		--load \
		-f Dockerfile \
		.
	@echo "✅ ARM64 镜像已加载到本地 Docker"

up:
	@echo "🚀 启动 MCP Agent 服务..."
	docker-compose up -d
	@echo "✅ 服务已启动，访问 http://localhost:3000"

down:
	@echo "🛑 停止服务..."
	docker-compose down

restart: down up

logs:
	@echo "📋 查看服务日志（Ctrl+C 退出）..."
	docker-compose logs -f

shell:
	@echo "🐚 进入容器 shell..."
	docker-compose exec mcp-gateway sh

clean:
	@echo "🧹 清理 Docker 资源..."
	docker-compose down -v
	docker rmi mcp-gateway:latest || true
	@echo "✅ 清理完成"

test:
	@echo "🧪 测试容器健康状态..."
	@if docker ps | grep -q mcp-gateway; then \
		echo "✅ 容器正在运行"; \
		docker exec mcp-gateway node -e "require('http').get('http://localhost:3000/health', (r) => {console.log('健康检查:', r.statusCode === 200 ? '✅ 通过' : '❌ 失败');process.exit(r.statusCode === 200 ? 0 : 1)})"; \
	else \
		echo "❌ 容器未运行"; \
		exit 1; \
	fi

# 本地开发命令
dev:
	@echo "🚀 启动本地开发环境..."
	bun run dev

build-local:
	@echo "🏗️  本地完整构建..."
	bun run build:full

# 组合命令
rebuild: clean build up
	@echo "✅ 重新构建并启动完成"

status:
	@echo "📊 服务状态："
	@docker-compose ps
