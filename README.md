# MCP Agent

一个强大的 MCP (Model Context Protocol) 代理服务，用于聚合多个 MCP 服务并通过统一接口管理。支持 stdio、SSE、HTTP、Embedded 四种服务类型，提供 Web 管理界面和环境检测功能。

[![Docker](https://img.shields.io/badge/Docker-Hub-blue?logo=docker)](https://hub.docker.com/r/kangkang223/mcp-agent)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ 核心特性

- 🔌 **多适配器支持** - stdio、embedded、sse、http 四种服务类型
- 🎨 **Web 管理界面** - 可视化配置、日志查看、环境检测
- 🔄 **动态服务管理** - 运行时加载/卸载，无需重启
- 🛠️ **环境检测** - 自动检测并管理 Node、Python、Rust、Java、Go 等运行时
- 🔐 **身份认证** - 可选的登录认证保护
- 🐳 **多平台 Docker** - 支持 AMD64 和 ARM64 架构

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 使用 Docker Compose
docker-compose up -d

# 或使用 Docker 命令
docker run -d -p 3000:3000 kangkang223/mcp-agent:latest

# 访问 Web 界面
open http://localhost:3000
```

### 开发模式

```bash
# 安装依赖
bun install

# 启动开发环境（API Server + Web 界面）
bun run dev

# 访问 Web 界面
open http://localhost:5174
```

## 📋 主要功能

### 服务管理
- ✅ 添加、编辑、删除、启动、停止服务
- ✅ 支持环境变量和参数配置
- ✅ 实时查看服务日志
- ✅ 导入 Claude Desktop / VS Code MCP 配置

### 环境检测
- ✅ 检测 Node.js、npm、npx、Python、pip、uv/uvx
- ✅ 检测 Rust、Cargo、Java、Go、Git
- ✅ 一键安装/卸载各运行时环境
- ✅ 自动识别 Linux 发行版包管理器（apt/apk/yum/dnf/pacman/zypper）

### 配置管理
- ✅ 可视化 JSON 配置编辑
- ✅ 配置热重载，自动应用更新
- ✅ 运行状态持久化

## 📁 项目结构

```
mcp-agent/
├── packages/
│   ├── server/      # API 服务器（Hono）
│   ├── web/         # Web 管理界面（React）
│   ├── cli/         # 命令行工具
│   ├── core/        # MCP 核心逻辑
│   └── shared/      # 共享类型
├── config/          # 配置文件
└── docs/            # 文档
```

## ⚙️ 配置服务

编辑 `config/web-config.json`：

```json
{
  "xiaozhi": {
    "endpoint": "wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN"
  },
  "services": [
    {
      "id": "memory",
      "type": "stdio",
      "name": "Memory",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  ]
}
```

支持的服务类型：
- `stdio`: 子进程通信（npx、本地脚本）
- `embedded`: 进程内服务（性能最优）
- `sse`: Server-Sent Events
- `http`: REST API

## � 安全配置（登录认证）

MCP Agent 支持 Web UI 登录认证保护，默认关闭。启用后，访问 Web UI 需要登录。

### Docker 环境配置

编辑 `docker-compose.yml`：

```yaml
environment:
  - MCP_AGENT_AUTH_ENABLE=true    # 启用认证
  - MCP_AGENT_USERNAME=admin      # 设置用户名
  - MCP_AGENT_PASSWORD=your_secure_password  # 设置密码
```

### 开发环境配置

创建 `.env` 文件（参考 `.env.example`）：

```bash
# 启用登录认证
MCP_AGENT_AUTH_ENABLE=true

# 设置用户名和密码
MCP_AGENT_USERNAME=admin
MCP_AGENT_PASSWORD=your_secure_password
```

⚠️ **安全提示**：
- 生产环境请务必修改默认密码
- 使用强密码（建议至少 12 位，包含大小写字母、数字和特殊字符）
- 建议配合 HTTPS 使用以保护传输过程中的凭据

## 📖 文档

- [快速开始](./QUICKSTART.md) - 详细安装和配置指南
- [架构设计](./ARCHITECTURE.md) - 项目架构和技术栈
- [Docker 部署](./docs/DOCKER.md) - 完整 Docker 部署指南
- [多服务配置](./docs/MULTI_SERVICES.md) - 服务配置示例

## 🛠️ 开发命令

```bash
# 本地开发
bun run dev              # 启动 API+Web 开发环境
bun run dev:server       # 只启动 API Server
bun run dev:web          # 只启动 Web 界面

# 构建
bun run build            # 构建所有包
bun run build:full       # 完整构建（含 Web 静态文件）

# Docker
make build               # 构建 Docker 镜像
make up                  # 启动服务
make logs                # 查看日志
make shell               # 进入容器
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

**相关链接**：
- 🐳 [Docker Hub](https://hub.docker.com/r/kangkang223/mcp-agent)
- 📚 [完整文档](./docs/)
- 🐛 [问题反馈](https://github.com/your-repo/issues)
