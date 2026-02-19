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

## 📋 功能使用说明

### 1. 服务管理
- **添加服务**：支持通过 Web 界面添加多种类型的 MCP 服务。
- **配置编辑**：可编辑服务的命令、参数、环境变量等配置。
- **状态控制**：一键启动、停止、重启服务。
- **日志监控**：实时查看服务的标准输出和错误日志，便于调试。
- **导入配置**：支持导入 Claude Desktop / VS Code 的 MCP 配置文件。

### 2. 环境检测与管理
- **运行时检测**：自动检测系统中安装的 Node.js、Python、Rust、Java、Go 等环境版本。
- **包管理器支持**：识别 npm、pip、cargo 等包管理器状态。
- **一键安装**：支持在界面上一键安装缺失的运行时环境（依赖于底层系统支持）。

### 3. 配置管理
- **可视化编辑**：提供 JSON 配置的可视化编辑器。
- **热重载**：配置修改后自动应用，无需重启 Agent。
- **持久化**：服务配置和运行状态会自动保存。

## 🔐 安全配置（登录认证）

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

## 📖 相关文档

- [Docker 部署指南](./docs/DOCKER.md) - 详细的 Docker 部署说明
- [开发者指南](./docs/DEVELOPMENT.md) - 开发环境搭建与调试
- [架构设计](./ARCHITECTURE.md) - 系统架构说明

## 🛠️ 常用命令

```bash
# 本地开发
bun run dev              # 启动 API+Web 开发环境

# 构建
bun run build            # 构建所有包

# Docker
make build               # 构建 Docker 镜像
make up                  # 启动服务
make logs                # 查看日志
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

**相关链接**：
- 🐳 [Docker Hub](https://hub.docker.com/r/kangkang223/mcp-agent)
