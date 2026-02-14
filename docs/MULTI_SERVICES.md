# 多服务集成指南

## 概述

MCP Agent 支持同时集成多个 MCP 服务，支持 4 种连接类型：

| 类型 | 使用场景 | 示例 |
|------|---------|------|
| **stdio** | 本地 npx 启动、子进程 | `npx @modelcontextprotocol/server-*` |
| **sse** | SSE 传输的远程服务 | calculator-mcp |
| **http** | HTTP REST API | 自定义 REST API |
| **embedded** | 内嵌到 Agent 进程 | 自定义 TypeScript 模块 |

## 配置示例

### 1. Stdio 模式（NPX 启动）

最方便的方式，无需预先安装，自动下载执行：

```json
{
  "id": "filesystem-npx",
  "type": "stdio",
  "name": "Filesystem Service",
  "description": "File system operations",
  "enabled": true,
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/Users/username/Documents"
  ]
}
```

**常用 MCP 官方服务：**

```json
// Weather
{
  "id": "weather",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-weather"],
  "env": {
    "WEATHER_API_KEY": "your-key"
  }
}

// GitHub
{
  "id": "github",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxx"
  }
}

// Postgres
{
  "id": "postgres",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "env": {
    "POSTGRES_CONNECTION_STRING": "postgresql://localhost/db"
  }
}

// Puppeteer
{
  "id": "puppeteer",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
}

// Slack
{
  "id": "slack",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-slack"],
  "env": {
    "SLACK_BOT_TOKEN": "xoxb-xxxx",
    "SLACK_TEAM_ID": "T01234567"
  }
}
```

### 2. 本地开发的 MCP 服务

如果你本地有开发的 MCP server：

```json
{
  "id": "my-local-service",
  "type": "stdio",
  "command": "node",
  "args": ["/path/to/your/project/dist/index.js"],
  "env": {
    "NODE_ENV": "production",
    "API_KEY": "your-key"
  }
}
```

或使用 Bun：

```json
{
  "id": "my-bun-service",
  "type": "stdio",
  "command": "bun",
  "args": ["run", "/path/to/your/project/src/index.ts"]
}
```

### 3. SSE 模式

适合已经运行的 SSE 服务：

```json
{
  "id": "calculator",
  "type": "sse",
  "name": "Calculator Service",
  "enabled": true,
  "url": "http://localhost:8931/sse",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

### 4. HTTP 模式

适合 REST API 后端：

```json
{
  "id": "api",
  "type": "http",
  "name": "REST API Service",
  "enabled": true,
  "baseUrl": "http://localhost:4000/mcp",
  "timeout": 30000,
  "headers": {
    "X-API-Key": "your-key"
  }
}
```

### 5. Embedded 模式

自定义 TypeScript 模块，直接嵌入 Agent：

```json
{
  "id": "custom",
  "type": "embedded",
  "name": "Custom Service",
  "enabled": true,
  "modulePath": "./services/custom.js",
  "options": {
    "config": "value"
  }
}
```

模块需要导出实现 `IMCPService` 接口的工厂函数。

## 测试多服务集成

### 步骤 1：创建测试配置

```bash
cp config/multi-services-example.json config/test-multi-services.json
```

### 步骤 2：编辑配置

1. 启用你想测试的服务（设置 `enabled: true`）
2. 配置必要的环境变量（API keys 等）
3. 调整路径和参数

### 步骤 3：启动

```bash
# 使用自定义配置
bun run start:dev -- --config ./config/test-multi-services.json

# 或修改 package.json 的默认配置
bun run start:dev
```

### 步骤 4：查看日志

```bash
tail -f logs/mcp-agent.log
```

每个服务启动时会显示：
```
[info]: Service initialized: Weather Service {"id":"weather-npx","toolCount":3}
[info]: Service initialized: Filesystem Service {"id":"filesystem-npx","toolCount":5}
```

## 性能建议

1. **按需启用**：只启用必需的服务，避免资源浪费
2. **stdio 数量**：stdio 模式会创建子进程，建议不超过 10 个
3. **超时设置**：为慢速服务增加 `timeout`（HTTP 模式）
4. **日志级别**：生产环境使用 `"level": "warn"` 减少 I/O

## 故障排查

### 服务启动失败

检查日志中的错误信息：

```bash
grep "Failed to initialize" logs/mcp-agent.log
```

常见问题：
- **Stdio**: 命令路径错误、参数不正确
- **SSE/HTTP**: 服务未启动、URL 错误、网络问题
- **Embedded**: 模块路径错误、接口未正确实现

### 工具未显示

1. 确认服务 `enabled: true`
2. 检查服务状态：日志中应有 "Service initialized"
3. 查看工具数量：`toolCount` 应 > 0

### 内存泄漏警告

如果看到：
```
MaxListenersExceededWarning: Possible EventEmitter memory leak
```

这是因为频繁重连导致的，需要修复连接稳定性问题。

## 示例：完整测试场景

假设你要测试以下场景：
- 本地计算器（SSE）
- 文件系统操作（npx）
- GitHub 集成（npx）

配置：

```json
{
  "services": [
    {
      "id": "calculator",
      "type": "sse",
      "enabled": true,
      "url": "http://localhost:8931/sse"
    },
    {
      "id": "filesystem",
      "type": "stdio",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    {
      "id": "github",
      "type": "stdio",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  ]
}
```

启动后应该看到：

```
[info]: Service initialized: Calculator Service {"toolCount":6}
[info]: Service initialized: Filesystem Service {"toolCount":8}
[info]: Service initialized: GitHub Service {"toolCount":15}
[info]: Total tools available: 29
```

在 xiaozhi 界面应能看到所有 29 个工具。

## 官方 MCP Servers 列表

参考：https://github.com/modelcontextprotocol/servers

常用的包括：
- `@modelcontextprotocol/server-filesystem` - 文件操作
- `@modelcontextprotocol/server-github` - GitHub API
- `@modelcontextprotocol/server-postgres` - 数据库
- `@modelcontextprotocol/server-puppeteer` - 浏览器自动化
- `@modelcontextprotocol/server-slack` - Slack 集成
- `@modelcontextprotocol/server-memory` - KV 存储

## 下一步

1. 阅读 [MCP 协议标准化](./MCP_PROTOCOL.md)
2. 了解如何[创建自定义服务](./CUSTOM_SERVICES.md)
3. 查看[完整配置参考](./CONFIG_REFERENCE.md)
