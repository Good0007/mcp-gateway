# MCP Agent

一个强大的 MCP (Model Context Protocol) 代理服务，用于聚合多个 MCP 服务并通过统一的 WebSocket 接口暴露给小智 AI 助手。

## ✨ 特性

- ✅ **多适配器支持**: stdio、embedded、sse、http 四种服务类型
- ✅ **动态服务管理**: 运行时加载/卸载服务，无需重启
- ✅ **Web 管理界面**: 直观的可视化配置和管理
- ✅ **环境检测**: 自动检测并管理 Node、Python、Rust、Java、Go 等开发环境
- ✅ **配置热重载**: 监听配置变化，自动应用更新
- ✅ **工具聚合**: 自动聚合所有服务的工具列表
- ✅ **自动重连**: WebSocket 连接断开自动重连

## 🚀 快速开始

### 开发模式

```bash
# 安装依赖
bun install

# 启动开发环境（API Server + Web 界面）
bun run dev
```

启动后访问 `http://localhost:5174` 即可使用。

### 生产部署（Docker）

```bash
# 使用 Docker Compose（推荐）
docker-compose up -d

# 或使用 Docker 命令
docker build -t mcp-agent:latest .
docker run -d -p 3000:3000 mcp-agent:latest

# 或使用 Make 命令（最简单）
make up
```

详细部署指南：
- 🚀 [Docker 快速开始](./DOCKER_QUICKSTART.md)
- 📚 [完整部署文档](./docs/DOCKER.md)

### 其他命令

```bash
# 生产模式
bun run build
bun run start

# 只启动 API Server
bun run dev:server

# 只启动 Web 界面
bun run dev:web
```

## 📋 Web 管理功能

- **服务管理**: 添加、编辑、删除、启动、停止服务
- **配置编辑**: 可视化编辑 JSON 配置和环境变量
- **日志查看**: 实时查看服务日志
- **环境检测**: 检测和管理开发环境依赖
  - Node.js、npm、npx
  - Python、pip、uv、uvx
  - Rust、Cargo、Java、Go、Git
  - 一键安装/卸载各环境
- **配置导入**: 支持从 Claude Desktop 或 VS Code MCP 配置导入
- **实时反馈**: Toast 通知提醒操作结果

## 📁 项目结构

```
mcp-agent/
├── packages/
│   ├── server/           # API 服务器
│   ├── web/              # Web 管理界面
│   ├── cli/              # 命令行工具
│   ├── core/             # 核心逻辑
│   └── shared/           # 共享类型和工具
├── config/               # 配置文件
└── docs/                 # 文档
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

## �📖 更多资源

- [QUICKSTART.md](./QUICKSTART.md) - 详细快速开始指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 项目架构和最佳实践
- [docs/DOCKER.md](./docs/DOCKER.md) - Docker 部署指南
- [docs/](./docs/) - 完整文档目录
