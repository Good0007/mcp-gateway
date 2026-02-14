# MCP Agent 快速启动指南

## 启动主服务

### 方式 1：开发模式（推荐用于调试）

使用 tsx 直接运行，支持热重载：

```bash
bun run dev
# 或
bun run start:dev
```

### 方式 2：生产模式

先编译，再运行：

```bash
# 编译 TypeScript
bun run build

# 启动服务
bun run start
```

## 前置条件

### 1. 确保 Calculator-MCP 服务已启动

```bash
# 在另一个终端窗口运行
npx @wrtnlabs/calculator-mcp@latest --port 8931
```

### 2. 检查配置文件

确保 `config/agent-config.json` 配置正确：

```json
{
  "xiaozhi": {
    "endpoint": "wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN"
  },
  "services": [
    {
      "id": "calculator",
      "name": "Calculator Service",
      "enabled": true,
      "type": "sse",
      "connection": {
        "url": "http://localhost:8931/sse"
      }
    }
  ]
}
```

### 3. 环境变量（可选）

如果使用 `.env` 文件配置：

```bash
# 复制示例文件
cp .env.example .env.local

# 编辑配置
# MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN
# LOG_LEVEL=info
```

## 启动流程

1. **启动 Calculator-MCP**（终端 1）：
   ```bash
   npx @wrtnlabs/calculator-mcp@latest --port 8931
   ```

2. **启动 MCP Agent**（终端 2）：
   ```bash
   cd /Users/kangkang/Workspace/ESP/mcp-agent
   bun run dev
   ```

3. **查看日志输出**：
   ```
   2026-02-14 21:42:51 [info]: Starting MCP Agent
   2026-02-14 21:42:51 [info]: Service initialized: Calculator Service {"toolCount":6}
   2026-02-14 21:42:51 [info]: Connected to xiaozhi
   2026-02-14 21:42:51 [info]: Agent is ready and connected
   ```

## 验证服务

### 方式 1：使用小智 AI 测试

在小智 AI 中尝试：
- "帮我计算 5 + 3"
- "17 乘以 23 等于多少？"
- "100 除以 4"

小智应该能够调用 calculator 工具进行计算。

### 方式 2：手动测试脚本

```bash
bun run test:manual
```

### 方式 3：集成测试

```bash
bun test tests/integration/calculator-xiaozhi.test.ts
```

## 命令行参数

```bash
# 使用自定义配置文件
tsx src/cli.ts --config=/path/to/config.json

# 或设置环境变量
MCP_AGENT_CONFIG=/path/to/config.json bun run dev
```

## 优雅关闭

按 `Ctrl+C` 或发送 SIGTERM 信号，服务会自动执行清理：
- 断开小智连接
- 关闭所有 MCP 服务
- 停止配置文件监听

## 故障排查

### 1. 无法连接到 Calculator-MCP

**症状**：日志显示 "Failed to connect to service: calculator"

**解决**：
```bash
# 检查 calculator-mcp 是否运行
lsof -i:8931

# 重启 calculator-mcp
npx @wrtnlabs/calculator-mcp@latest --port 8931
```

### 2. 小智连接失败

**症状**：日志显示 "Failed to connect to xiaozhi"

**解决**：
- 检查 token 是否有效
- 确认网络连接
- 验证 endpoint URL

### 3. 工具未注册到小智

**症状**：小智无法看到工具

**解决**：
```bash
# 查看服务状态
# 日志中应该有：
# [info]: Service started, notifying xiaozhi
# [info]: Connected to xiaozhi, agent ready
```

## 开发技巧

### 监控日志

```bash
# 使用 debug 级别日志
LOG_LEVEL=debug bun run dev
```

### 热重载配置

修改 `config/agent-config.json` 后，服务会自动重新加载配置，无需重启。

### 多服务集成

在 `config/agent-config.json` 中添加更多服务：

```json
{
  "services": [
    {
      "id": "calculator",
      "enabled": true,
      "type": "sse",
      "connection": { "url": "http://localhost:8931/sse" }
    },
    {
      "id": "weather",
      "enabled": true,
      "type": "sse",
      "connection": { "url": "http://localhost:8932/sse" }
    }
  ]
}
```

## 下一步

- 📖 阅读 [README.md](./README.md) 了解完整功能
- 🔧 查看 [TECHNICAL_SPEC.md](./docs/TECHNICAL_SPEC.md) 了解技术细节
- 🧪 运行 `bun test` 查看所有测试
- 📝 查看 [tests/integration/README.md](./tests/integration/README.md) 了解集成测试
