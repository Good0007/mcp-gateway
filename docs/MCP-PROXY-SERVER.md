# MCP 代理服务器实现方案

## 概述

将 mcp-agent 扩展为 MCP 代理服务器，统一暴露聚合的工具给其他 MCP 客户端（VS Code、Claude Desktop 等）。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Clients                            │
│  (VS Code, Claude Desktop, Other MCP Clients)               │
└────────────────────┬────────────────────────────────────────┘
                     │ SSE/HTTP (MCP Protocol)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   mcp-agent (Proxy Server)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MCP Protocol Server Routes                          │   │
│  │  - /mcp/sse   (SSE Transport)                       │   │
│  │  - /mcp/http  (HTTP Transport)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tool Aggregator (已有)                              │   │
│  │  - 聚合所有服务的工具                                 │   │
│  │  - 路由工具调用到对应服务                             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┬──────────────┐
      ▼              ▼              ▼              ▼
┌─────────┐  ┌─────────────┐  ┌─────────┐  ┌─────────┐
│Filesystem│  │Home Assistant│  │Memory   │  │Calculator│
│(stdio)   │  │(SSE)        │  │(stdio)  │  │(embedded)│
└─────────┘  └─────────────┘  └─────────┘  └─────────┘
```

## 1. VS Code 中配置 SSE 服务

### 当前问题
- mcp-agent 目前只是 MCP **客户端**，聚合多个 MCP 服务
- 无法被其他 MCP 客户端（如 VS Code）连接

### VS Code 配置示例

在 `settings.json` 中：

```json
{
  "mcp.servers": {
    "mcp-agent-proxy": {
      "type": "sse",
      "url": "http://localhost:3001/mcp/sse",
      "description": "MCP Agent 统一代理"
    }
  }
}
```

## 2. 实现方案

### 2.1 核心功能

#### A. MCP 协议服务器路由 (`packages/server/src/routes/mcp-proxy.ts`)

实现 MCP 协议的 SSE transport：

```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getAgent } from '../agent.js';

const app = new Hono();

// SSE endpoint for MCP protocol
app.get('/sse', async (c) => {
  const agent = await getAgent();
  const aggregator = agent.getAggregator();
  
  return streamSSE(c, async (stream) => {
    // MCP protocol message handler
    const handleMessage = async (data: any) => {
      const { jsonrpc, id, method, params } = data;
      
      try {
        let result: any;
        
        switch (method) {
          case 'initialize':
            result = {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: { listChanged: true },
              },
              serverInfo: {
                name: 'mcp-agent-proxy',
                version: '1.0.0',
              },
            };
            break;
            
          case 'tools/list':
            const tools = await aggregator.getAllTools();
            result = {
              tools: tools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: {
                  type: 'object',
                  properties: t.parameters,
                  required: Object.entries(t.parameters)
                    .filter(([_, p]) => p.required)
                    .map(([name]) => name),
                },
              })),
            };
            break;
            
          case 'tools/call':
            const callResult = await aggregator.callTool({
              name: params.name,
              arguments: params.arguments,
            });
            result = callResult;
            break;
            
          default:
            throw new Error(`Unknown method: ${method}`);
        }
        
        await stream.writeSSE({
          data: JSON.stringify({ jsonrpc, id, result }),
        });
      } catch (error: any) {
        await stream.writeSSE({
          data: JSON.stringify({
            jsonrpc,
            id,
            error: {
              code: -32603,
              message: error.message,
            },
          }),
        });
      }
    };
    
    // Handle incoming POST messages via separate endpoint
    // (SSE is read-only, client sends via POST)
    c.req.raw.signal.addEventListener('abort', () => {
      stream.close();
    });
    
    // Keep connection alive
    const keepAlive = setInterval(async () => {
      await stream.writeSSE({ comment: 'keep-alive' });
    }, 15000);
    
    await stream.onAbort(() => {
      clearInterval(keepAlive);
    });
  });
});

// POST endpoint for client -> server messages
app.post('/message', async (c) => {
  const message = await c.req.json();
  // Store message in queue for SSE handler to process
  // (需要实现消息队列机制)
  return c.json({ success: true });
});

export default app;
```

#### B. Web UI 配置开关

在 Web UI 的环境检测页面添加：

```typescript
// packages/web/src/pages/EnvironmentPage.tsx

export function ProxyServerSettings() {
  const [enabled, setEnabled] = useState(false);
  const [port, setPort] = useState(3001);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP 代理服务器</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">启用代理服务器</h4>
              <p className="text-sm text-gray-500">
                允许其他 MCP 客户端连接到此代理
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          
          {enabled && (
            <>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium mb-2">VS Code 配置</h5>
                <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded">
{`{
  "mcp.servers": {
    "mcp-agent": {
      "type": "sse",
      "url": "http://localhost:${port}/mcp/sse"
    }
  }
}`}
                </pre>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h5 className="font-medium mb-2">Claude Desktop 配置</h5>
                <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded">
{`{
  "mcpServers": {
    "mcp-agent": {
      "url": "http://localhost:${port}/mcp/sse"
    }
  }
}`}
                </pre>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 2.2 实现步骤

#### Phase 1: 基础 SSE 服务器
1. ✅ 创建 `/mcp/sse` 路由
2. ✅ 实现 `initialize` 方法
3. ✅ 实现 `tools/list` 方法
4. ✅ 实现 `tools/call` 方法

#### Phase 2: 双向通信
5. ⬜ 实现 POST `/mcp/message` 接收客户端消息
6. ⬜ 实现消息队列（内存或 Redis）
7. ⬜ 将 POST 消息路由到 SSE 流处理

#### Phase 3: Web UI 集成
8. ⬜ 添加代理服务器启用/禁用开关
9. ⬜ 显示连接配置示例
10. ⬜ 实时显示已连接客户端数量

#### Phase 4: 高级功能
11. ⬜ 添加认证（Bearer Token）
12. ⬜ 添加速率限制
13. ⬜ 日志记录（来自哪个客户端的调用）
14. ⬜ HTTP transport 支持

### 2.3 配置管理

在 `web-config.json` 中添加：

```json
{
  "proxy": {
    "enabled": true,
    "port": 3001,
    "transports": ["sse", "http"],
    "auth": {
      "enabled": false,
      "token": "your-secret-token"
    },
    "rateLimit": {
      "enabled": true,
      "maxRequestsPerMinute": 60
    }
  }
}
```

## 3. 使用场景

### 场景 1: VS Code 集成
```json
// VS Code settings.json
{
  "mcp.servers": {
    "my-tools": {
      "type": "sse",
      "url": "http://localhost:3001/mcp/sse"
    }
  }
}
```

### 场景 2: Claude Desktop 集成
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "my-tools": {
      "url": "http://localhost:3001/mcp/sse"
    }
  }
}
```

### 场景 3: 远程访问（带认证）
```json
{
  "mcp.servers": {
    "remote-agent": {
      "type": "sse",
      "url": "https://my-server.com/mcp/sse",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

## 4. 技术细节

### SSE Transport 协议

MCP over SSE 使用以下机制：
1. **Client → Server**: HTTP POST 到 `/message` 端点
2. **Server → Client**: SSE 事件流

消息格式（JSON-RPC 2.0）:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "/path/to/file"
    }
  }
}
```

### 关键依赖

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "hono": "^4.6.14"
  }
}
```

## 5. 安全考虑

1. **认证**: 使用 Bearer Token 验证客户端身份
2. **CORS**: 限制允许的源
3. **速率限制**: 防止滥用
4. **日志审计**: 记录所有工具调用
5. **工具权限**: 可选的工具白名单/黑名单

## 6. 后续优化

- [ ] WebSocket transport 支持（更高效）
- [ ] 多客户端并发连接管理
- [ ] 工具调用统计和监控
- [ ] 客户端会话管理
- [ ] 动态工具注册/注销通知
- [ ] 资源（resources）和提示（prompts）支持

## 实现优先级

### P0 (MVP)
- SSE endpoint (`/mcp/sse`)
- `initialize`, `tools/list`, `tools/call` 方法
- Web UI 显示代理状态

### P1
- 认证机制
- 日志记录
- 配置持久化

### P2
- HTTP transport
- 高级安全功能
- 性能监控

---

**预计开发时间**: P0 约 1-2 天，P1 约 2-3 天
