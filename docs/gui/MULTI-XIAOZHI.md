# 多 Xiaozhi 服务支持设计

## 📋 需求说明

用户可能有多个 Xiaozhi 实例场景：
- 生产环境 + 测试环境
- 个人账号 + 工作账号
- 不同配置的工具集
- 分别管理不同的项目/团队

## 🏗️ 架构设计

```
┌─────────────────────────────────────────┐
│       MCP Agent GUI (C端)               │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Xiaozhi Connection Manager      │ │
│  │                                   │ │
│  │   connections: [                  │ │
│  │     {id: "main", ...}             │ │
│  │     {id: "test", ...}             │ │
│  │   ]                               │ │
│  └───────────────────────────────────┘ │
│           │           │                 │
│           ▼           ▼                 │
│  ┌─────────────┐ ┌─────────────┐      │
│  │ Connection1 │ │ Connection2 │      │
│  │ wss://...   │ │ wss://...   │      │
│  └─────────────┘ └─────────────┘      │
└─────────────────────────────────────────┘
         │                   │
         ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Xiaozhi 主号  │    │ Xiaozhi 测试  │
│ 生产环境      │    │ 开发环境      │
└──────────────┘    └──────────────┘
```

## 📊 数据库设计

### SQLite 表结构

```sql
-- Xiaozhi 连接配置表
CREATE TABLE xiaozhi_connections (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  auto_connect BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- 连接状态表（运行时数据）
CREATE TABLE xiaozhi_connection_status (
  connection_id VARCHAR(50) PRIMARY KEY,
  status VARCHAR(20),           -- 'connected', 'disconnected', 'connecting', 'error'
  connected_at TIMESTAMP,
  last_ping TIMESTAMP,
  uptime INTEGER,               -- 秒
  tool_count INTEGER,
  call_count INTEGER,
  error_message TEXT,
  FOREIGN KEY (connection_id) REFERENCES xiaozhi_connections(id)
);

-- 连接与服务的关联表（每个连接使用哪些服务）
CREATE TABLE xiaozhi_connection_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id VARCHAR(50),
  service_id VARCHAR(50),
  enabled BOOLEAN DEFAULT true,
  FOREIGN KEY (connection_id) REFERENCES xiaozhi_connections(id),
  FOREIGN KEY (service_id) REFERENCES installed_plugins(id) OR custom_plugins(id)
);

-- 示例数据
INSERT INTO xiaozhi_connections VALUES
  ('main', 'Xiaozhi 主账号', 'wss://api.xiaozhi.me/mcp/', true, true, '生产环境主账号', now(), now()),
  ('test', 'Xiaozhi 测试环境', 'wss://test.xiaozhi.me/mcp/', false, false, '测试开发环境', now(), now());

-- 配置不同的工具集
INSERT INTO xiaozhi_connection_services VALUES
  (1, 'main', 'calculator', true),
  (2, 'main', 'filesystem-npx', true),
  (3, 'test', 'calculator', true),
  (4, 'test', 'memory-npx', true);
```

## ⚙️ 配置文件

```json
{
  "xiaozhi": {
    "connections": [
      {
        "id": "main",
        "name": "Xiaozhi 主账号",
        "endpoint": "wss://api.xiaozhi.me/mcp/",
        "enabled": true,
        "autoConnect": true,
        "description": "生产环境主账号",
        "services": [
          "calculator",
          "filesystem-npx"
        ]
      },
      {
        "id": "test",
        "name": "Xiaozhi 测试环境",
        "endpoint": "wss://test.xiaozhi.me/mcp/",
        "enabled": false,
        "autoConnect": false,
        "description": "测试开发环境",
        "services": [
          "calculator",
          "memory-npx"
        ]
      }
    ],
    "defaultConnection": "main"
  },
  "services": [
    {
      "id": "calculator",
      "type": "sse",
      "enabled": true,
      "url": "http://localhost:8931/sse"
    },
    {
      "id": "filesystem-npx",
      "type": "stdio",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/kangkang"]
    }
  ]
}
```

## 🔧 核心类设计

### XiaozhiConnectionManager

```typescript
class XiaozhiConnectionManager {
  private connections: Map<string, XiaozhiConnection> = new Map();
  
  async addConnection(config: XiaozhiConnectionConfig): Promise<void> {
    const connection = new XiaozhiConnection(config);
    this.connections.set(config.id, connection);
    
    if (config.autoConnect) {
      await connection.connect();
    }
  }
  
  async connectConnection(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) throw new Error('Connection not found');
    await conn.connect();
  }
  
  async disconnectConnection(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) throw new Error('Connection not found');
    await conn.disconnect();
  }
  
  getConnection(id: string): XiaozhiConnection | undefined {
    return this.connections.get(id);
  }
  
  getAllConnections(): XiaozhiConnection[] {
    return Array.from(this.connections.values());
  }
  
  async updateConnectionServices(id: string, serviceIds: string[]): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) throw new Error('Connection not found');
    
    // 重新加载工具列表
    await conn.reloadServices(serviceIds);
  }
}
```

### 修改后的 XiaozhiConnection

```typescript
class XiaozhiConnection {
  private id: string;
  private name: string;
  private endpoint: string;
  private ws: WebSocket | null = null;
  private serviceIds: string[];
  private toolAggregator: ToolAggregator;
  
  constructor(config: XiaozhiConnectionConfig) {
    this.id = config.id;
    this.name = config.name;
    this.endpoint = config.endpoint;
    this.serviceIds = config.services || [];
    
    // 创建专属的 ToolAggregator
    this.toolAggregator = new ToolAggregator(this.serviceIds);
  }
  
  async connect(): Promise<void> {
    this.ws = new WebSocket(this.endpoint);
    
    this.ws.on('open', () => {
      this.emit('connected', { connectionId: this.id });
      this.startHeartbeat();
    });
    
    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });
  }
  
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.emit('disconnected', { connectionId: this.id });
    }
  }
  
  async reloadServices(serviceIds: string[]): Promise<void> {
    this.serviceIds = serviceIds;
    await this.toolAggregator.reloadServices(serviceIds);
    
    // 重新发送工具列表
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const tools = await this.toolAggregator.getAllTools();
      this.sendNotification('tools/list_changed', {});
    }
  }
  
  private async handleListTools(request: any): Promise<void> {
    // 只返回这个连接配置的工具
    const tools = await this.toolAggregator.getAllTools();
    
    this.sendResponse(request.id, {
      tools: tools
    });
  }
}
```

## 🎨 UI 设计

### Xiaozhi 服务管理页面

```
┌────────────────────────────────────────────────┐
│  🌐 Xiaozhi 服务                               │
├────────────────────────────────────────────────┤
│  [+ 添加连接]                  [测试全部连接]  │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 🌐 Xiaozhi 主账号            🟢 已连接   │ │
│  │                                          │ │
│  │ 端点: wss://api.xiaozhi.me/mcp/          │ │
│  │ 在线: 2小时15分  工具: 20个  调用: 47次  │ │
│  │                                          │ │
│  │ 使用的服务:                              │ │
│  │ • Calculator (6 tools)                   │ │
│  │ • Filesystem (14 tools)                  │ │
│  │                                          │ │
│  │ [断开] [重连] [编辑] [删除]              │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 🌐 Xiaozhi 测试环境          ⚪ 未连接   │ │
│  │                                          │ │
│  │ 端点: wss://test.xiaozhi.me/mcp/         │ │
│  │ 状态: 手动停止                           │ │
│  │                                          │ │
│  │ 使用的服务:                              │ │
│  │ • Calculator (6 tools)                   │ │
│  │ • Memory (8 tools)                       │ │
│  │                                          │ │
│  │ [启动] [编辑] [删除]                     │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ ➕ 添加新的 Xiaozhi 连接                 │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### 添加/编辑连接弹窗

```
┌─────────────────────────────────────┐
│  添加 Xiaozhi 连接              [✕] │
├─────────────────────────────────────┤
│  基本信息                           │
│  ┌───────────────────────────────┐ │
│  │ 连接名称: [Xiaozhi 主账号    ]│ │
│  │ 描述: [生产环境主账号        ]│ │
│  │ 端点: [wss://api.xiaozhi.me/ ]│ │
│  └───────────────────────────────┘ │
│                                     │
│  连接选项                           │
│  ☑ 启动时自动连接                   │
│  ☑ 启用此连接                       │
│                                     │
│  使用的服务                         │
│  ┌───────────────────────────────┐ │
│  │ ☑ Calculator                  │ │
│  │ ☑ Filesystem                  │ │
│  │ ☐ Memory                      │ │
│  │ ☐ Slack                       │ │
│  └───────────────────────────────┘ │
│                                     │
│  💡 提示: 每个连接可以配置不同的    │
│     工具集，工具调用会路由到对应    │
│     的 Xiaozhi 实例。               │
│                                     │
│  [测试连接]    [保存]  [取消]      │
└─────────────────────────────────────┘
```

## 📡 API 接口

```typescript
// 获取所有 Xiaozhi 连接
GET /api/xiaozhi/connections
Response: [
  {
    id: "main",
    name: "Xiaozhi 主账号",
    endpoint: "wss://api.xiaozhi.me/mcp/",
    status: "connected",
    uptime: 8100,
    toolCount: 20,
    services: ["calculator", "filesystem-npx"]
  }
]

// 添加连接
POST /api/xiaozhi/connections
Body: {
  name: "Xiaozhi 测试",
  endpoint: "wss://test.xiaozhi.me/mcp/",
  autoConnect: false,
  services: ["calculator"]
}

// 更新连接
PUT /api/xiaozhi/connections/:id
Body: {
  name: "Xiaozhi 主账号（更新）",
  services: ["calculator", "memory"]
}

// 删除连接
DELETE /api/xiaozhi/connections/:id

// 连接操作
POST /api/xiaozhi/connections/:id/connect
POST /api/xiaozhi/connections/:id/disconnect
POST /api/xiaozhi/connections/:id/reconnect

// 测试连接
POST /api/xiaozhi/connections/:id/test
Response: {
  success: true,
  latency: 234,
  error: null
}

// 更新连接的服务列表
PUT /api/xiaozhi/connections/:id/services
Body: {
  services: ["calculator", "filesystem-npx"]
}
```

## 🔄 实时状态推送

```typescript
// WebSocket 事件
socket.on('xiaozhi:connection:status', (data) => {
  // {
  //   connectionId: 'main',
  //   status: 'connected',
  //   uptime: 8100,
  //   toolCount: 20
  // }
});

socket.on('xiaozhi:connection:error', (data) => {
  // {
  //   connectionId: 'main',
  //   error: 'Connection timeout'
  // }
});

socket.on('xiaozhi:tool:called', (data) => {
  // {
  //   connectionId: 'main',
  //   tool: 'add',
  //   params: {...},
  //   result: 8
  // }
});
```

## 🎯 使用场景

### 场景 1: 生产/测试分离

```
Xiaozhi 主账号 (生产)
├─ Calculator
├─ Filesystem
└─ Slack (发送到生产频道)

Xiaozhi 测试环境 (开发)
├─ Calculator
├─ Memory (测试数据)
└─ Slack (发送到测试频道)
```

### 场景 2: 不同项目

```
项目 A - Xiaozhi
├─ Calculator
├─ Project A Database
└─ Project A API

项目 B - Xiaozhi
├─ Calculator
├─ Project B Database
└─ Project B API
```

### 场景 3: 个人/团队分离

```
个人账号
├─ Calculator
├─ Personal Files
└─ Personal Memory

团队账号
├─ Calculator
├─ Team Files
└─ Team Slack
```

## ⚠️ 注意事项

1. **工具名称冲突**: 如果多个连接使用相同的服务，需要确保正确路由
2. **性能考虑**: 多个连接会占用更多资源，建议最多 3-5 个活跃连接
3. **配置同步**: 修改服务配置时，需要通知所有相关连接重新加载
4. **状态管理**: 每个连接独立管理状态，避免相互干扰

## 🔧 迁移指南

从单连接迁移到多连接：

```json
// 旧配置
{
  "xiaozhi": {
    "endpoint": "wss://api.xiaozhi.me/mcp/"
  }
}

// 新配置（自动迁移）
{
  "xiaozhi": {
    "connections": [
      {
        "id": "default",
        "name": "默认连接",
        "endpoint": "wss://api.xiaozhi.me/mcp/",
        "enabled": true,
        "autoConnect": true,
        "services": ["*"]  // 所有服务
      }
    ]
  }
}
```

迁移脚本会自动执行，用户无感知升级。
