# Calculator + Xiaozhi 集成测试指南

这个集成测试演示了如何使用 MCP Agent 连接 calculator-mcp 服务并接入小智 AI。

## 前提条件

### 1. 启动 Calculator MCP 服务

在终端中运行：

```bash
npx @wrtnlabs/calculator-mcp@latest --port 8931
```

你应该看到类似输出：
```
This server is running on SSE (http://localhost:8931/sse?sessionId=<sessionId>)
Listening on http://localhost:8931
```

**保持这个终端运行！**

### 2. 配置小智端点

确保 `.env.local` 文件包含正确的小智端点配置：

```env
MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN_HERE
```

### 3. 检查配置文件

`config/agent-config.json` 应该包含：

```json
{
  "xiaozhi": {
    "endpoint": "wss://api.xiaozhi.me/mcp/?token=...",
    "reconnectInterval": 5000,
    "maxReconnectAttempts": 10
  },
  "services": [
    {
      "id": "calculator",
      "type": "sse",
      "name": "Calculator Service",
      "description": "Basic arithmetic operations",
      "enabled": true,
      "url": "http://localhost:8931/sse"
    }
  ]
}
```

## 运行测试

### 方式 1: 手动测试脚本（推荐）

这个脚本会逐步执行测试并显示详细输出：

```bash
bun run test:manual
```

#### 期望输出：

```
🚀 Starting Manual Integration Test
============================================================

📋 Step 1: Loading configuration...
✓ Configuration loaded
  - Xiaozhi endpoint: wss://api.xiaozhi.me/mcp/?token=...
  - Services: 4
  - Enabled: 1

🤖 Step 2: Initializing MCP Agent...
✓ MCP Agent initialized

▶️  Step 3: Starting MCP Agent...
✓ MCP Agent started
  - Total services: 4
  - Running: 1
  - Stopped: 3
  - Error: 0

🔧 Step 4: Listing available tools...
✓ Found 4 tools:
  - add: Add two numbers
  - subtract: Subtract two numbers
  - multiply: Multiply two numbers
  - divide: Divide two numbers

🧮 Step 5: Testing calculator tools...

Test 1: add(5, 3)
  Result: 8
  ✓ Addition works

Test 2: subtract(10, 4)
  Result: 6
  ✓ Subtraction works

Test 3: multiply(6, 7)
  Result: 42
  ✓ Multiplication works

Test 4: divide(20, 4)
  Result: 5
  ✓ Division works

Test 5: divide(10, 0) - expecting error
  ✓ Error handled correctly: Division by zero

🌐 Step 6: Checking Xiaozhi connection...
✓ Connected to Xiaozhi endpoint
  小智现在可以使用 calculator 工具了！

============================================================
✅ All manual tests completed successfully!
```

### 方式 2: Jest 集成测试

运行完整的集成测试套件：

```bash
bun run test:integration
```

这会运行所有集成测试，包括：
- 配置加载测试
- 服务连接测试
- 工具列表测试
- 工具调用测试
- 错误处理测试
- 小智连接测试

## 测试内容

### 1. 配置加载
- 验证配置文件正确加载
- 检查小智端点配置
- 确认服务列表正确

### 2. 服务启动
- 初始化 MCP Agent
- 连接到 calculator-mcp 服务（SSE）
- 验证服务状态

### 3. 工具列表
验证 calculator 提供的 4 个工具：
- `add` - 加法
- `subtract` - 减法
- `multiply` - 乘法
- `divide` - 除法

### 4. 工具调用
测试各种计算场景：
- ✅ `add(5, 3)` = 8
- ✅ `subtract(10, 4)` = 6
- ✅ `multiply(6, 7)` = 42
- ✅ `divide(20, 4)` = 5
- ❌ `divide(10, 0)` = Error (除零错误)

### 5. 小智连接
- 连接到小智 WebSocket 端点
- 验证连接状态
- 准备接收小智的工具调用请求

## 故障排查

### Calculator 服务未启动

**错误**: `ECONNREFUSED` 或 `failed to connect to SSE`

**解决方案**:
```bash
# 确保 calculator-mcp 正在运行
npx @wrtnlabs/calculator-mcp@latest --port 8931
```

### 小智连接失败

**错误**: `WebSocket connection failed` 或 `Not connected to Xiaozhi`

**检查**:
1. `.env.local` 中的 token 是否有效
2. 网络连接是否正常
3. Token 是否过期（检查 `exp` 字段）

### 工具未找到

**错误**: `Tool not found: add`

**检查**:
1. Calculator 服务是否成功启动
2. 配置文件中 `calculator` 服务是否 `enabled: true`
3. URL 是否正确: `http://localhost:8931/sse`

## 下一步

### 在小智中使用

1. 确保手动测试通过，特别是"Connected to Xiaozhi endpoint"
2. 在小智 AI 对话中，尝试：
   ```
   帮我计算 123 + 456
   5 乘以 8 等于多少？
   100 除以 4
   ```

3. 小智会自动调用 MCP Agent 提供的 calculator 工具

### 添加更多服务

1. 在 `config/agent-config.json` 中添加新服务
2. 设置 `enabled: true`
3. 重新运行测试验证

### 开发自己的 MCP 服务

参考 calculator-mcp 的实现：
- https://github.com/wrtnlabs/calculator-mcp
- 实现 MCP 协议的工具列表和调用接口
- 通过 stdio、SSE 或 HTTP 暴露服务

## 性能指标

典型测试时间：
- 配置加载: ~50ms
- Agent 启动: ~2s
- SSE 连接: ~500ms
- 工具调用: ~100ms/次
- WebSocket 连接: ~1s

## 相关文档

- [MCP Agent 架构](../../docs/ARCHITECTURE.md)
- [配置文件说明](../../docs/CONFIG_SCHEMA.md)
- [适配器接口](../../docs/ADAPTER_INTERFACE.md)
- [小智协议](../../docs/XIAOZHI_PROTOCOL.md)
- [错误处理](../../docs/ERROR_HANDLING.md)
