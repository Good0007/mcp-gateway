# MCP Agent 文档中心

欢迎使用 MCP Agent！本文档将帮助您快速了解和使用系统。

## 📚 文档导航

### 🚀 快速开始

如果您是第一次使用，请按以下顺序阅读：

1. **[项目介绍](../README.md)** - 了解 MCP Agent 是什么
2. **[快速上手](../QUICKSTART.md)** - 3 分钟启动服务
3. **[Docker 部署](DOCKER.md)** - 使用 Docker 快速部署（推荐生产环境）
4. **[多服务集成指南](MULTI_SERVICES.md)** - 添加和配置 MCP 服务

### 🏗️ 架构文档

深入了解系统设计：

- **[架构设计](../ARCHITECTURE.md)** - Monorepo 结构、模块依赖、构建流程
- **[MCP 代理服务器](MCP-PROXY-SERVER.md)** - VS Code / Claude Desktop 接入方案

### 📅 开发计划

- **[产品路线图](ROADMAP.md)** - 功能规划和待办事项

### 📦 历史归档

已完成或废弃的文档存放在 [archived/](archived/) 目录。

---

## 🗂️ 文档概览

| 文档 | 位置 | 目标读者 | 内容 |
|------|------|----------|------|
| **README** | 根目录 | 所有人 | 项目介绍、特性、快速命令 |
| **QUICKSTART** | 根目录 | 新用户 | 安装、启动、基本配置 |
| **ARCHITECTURE** | 根目录 | 开发者 | Monorepo 架构、依赖关系、构建流程 |
| **DOCKER** | docs/ | 运维/用户 | Docker 部署指南、故障排查 |
| **MULTI_SERVICES** | docs/ | 用户 | 多服务配置示例（stdio/sse/http/embedded） |
| **MCP-PROXY-SERVER** | docs/ | 开发者/用户 | MCP 代理功能、VS Code/Claude 配置 |
| **ROADMAP** | docs/ | 开发者 | 功能规划、待办事项 |

---

## 🎯 按角色推荐阅读

### 👤 新用户

我想快速体验 MCP Agent：

```bash
# 1. 克隆项目
git clone <repo-url>

# 2. 安装依赖
bun install

# 3. 启动服务
bun run dev

# 4. 访问 http://localhost:5174
```

📖 然后阅读：[QUICKSTART.md](../QUICKSTART.md)

---

### 👨‍💻 开发者

我想了解代码结构并贡献代码：

1. 📖 阅读 [ARCHITECTURE.md](../ARCHITECTURE.md) - 理解 Monorepo 结构
2. 🔍 查看各包源码：
   - `packages/shared/` - 共享类型定义
   - `packages/core/` - MCP 核心逻辑
   - `packages/server/` - HTTP API 服务
   - `packages/web/` - React 前端界面
3. 📅 查看 [ROADMAP.md](ROADMAP.md) - 了解开发计划

---

### 🔌 集成者

我想将 MCP Agent 接入到我的应用：

1. 📖 阅读 [MCP-PROXY-SERVER.md](MCP-PROXY-SERVER.md) - 了解代理功能
2. 📖 阅读 [MULTI_SERVICES.md](MULTI_SERVICES.md) - 学习配置 MCP 服务
3. 🔧 根据场景选择集成方式：
   - **VS Code / Claude Desktop**: 使用 MCP 代理端点
   - **自定义应用**: 调用 REST API (`/api/tools`, `/api/tools/call`)

---

## 💡 常见问题

### 如何添加新的 MCP 服务？

通过 Web 界面或编辑 `config/web-config.json`，参考 [MULTI_SERVICES.md](MULTI_SERVICES.md)。

### 如何在 VS Code 中使用？


### 如何使用 Docker 部署？

查看 [DOCKER.md](DOCKER.md) 获取完整的 Docker 部署指南，快速开始：

```bash
docker-compose up -d
```
配置 `.vscode/mcp.json`，参考 [MCP-PROXY-SERVER.md](MCP-PROXY-SERVER.md)。

### 如何修改代码并贡献？

查看 [ARCHITECTURE.md](../ARCHITECTURE.md) 了解项目结构，然后提交 PR。

---

## 📝 贡献文档

文档持续更新中，欢迎贡献：

- 发现错误？提 Issue
- 有改进建议？提 PR
- 文档不清楚？在 Issue 中反馈

---

## 🔗 外部资源

- [Model Context Protocol 官方文档](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/sdk)
- [小智 AI 官网](https://xiaozhi.me/)
