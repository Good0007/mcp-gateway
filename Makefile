.PHONY: help build up down restart logs shell clean test

# 默认目标
help:
	@echo "MCP Agent - Docker 管理命令"
	@echo ""
	@echo "使用方式: make [target]"
	@echo ""
	@echo "可用命令:"
	@echo "  build         构建 Docker 镜像"
	@echo "  up            启动服务（后台模式）"
	@echo "  down          停止服务"
	@echo "  restart       重启服务"
	@echo "  logs          查看日志"
	@echo "  shell         进入容器 shell"
	@echo "  clean         清理所有容器和镜像"
	@echo "  test          测试容器是否正常运行"
	@echo ""
	@echo "开发命令:"
	@echo "  dev           启动本地开发环境"
	@echo "  build-local   本地完整构建"
	@echo ""

# Docker 命令
build:
	@echo "🏗️  构建 Docker 镜像..."
	docker-compose build

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
	docker-compose exec mcp-agent sh

clean:
	@echo "🧹 清理 Docker 资源..."
	docker-compose down -v
	docker rmi mcp-agent:latest || true
	@echo "✅ 清理完成"

test:
	@echo "🧪 测试容器健康状态..."
	@if docker ps | grep -q mcp-agent; then \
		echo "✅ 容器正在运行"; \
		docker exec mcp-agent node -e "require('http').get('http://localhost:3000/health', (r) => {console.log('健康检查:', r.statusCode === 200 ? '✅ 通过' : '❌ 失败');process.exit(r.statusCode === 200 ? 0 : 1)})"; \
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
