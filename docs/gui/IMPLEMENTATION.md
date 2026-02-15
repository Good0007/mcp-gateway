# 实施计划

## Phase 1: 项目搭建 (1天)

### 1.1 创建项目结构
```bash
cd mcp-agent
mkdir -p gui/packages/{web,server}

# Web 前端
cd gui/packages/web
npm create vite@latest . -- --template react-ts
npm install

# 安装依赖
npm install \
  react-router-dom \
  zustand \
  @tanstack/react-query \
  tailwindcss \
  @radix-ui/react-* \
  lucide-react

# Server
cd ../server
npm init -y
npm install express ws cors
npm install -D @types/express @types/ws @types/cors
```

### 1.2 配置工具链
- TailwindCSS 配置
- TypeScript 配置
- ESLint + Prettier
- Vite 配置（代理 API）

### 1.3 基础布局
- Layout 组件
- Sidebar 导航
- Header 顶栏
- 路由配置

**验收标准**: 
- ✅ 项目启动无错误
- ✅ 基础路由可访问
- ✅ 布局正常显示

---

## Phase 2: API Server (2天)

### 2.1 Express 服务器
```typescript
// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// API Routes
app.use('/api/plugins', pluginsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/logs', logsRouter);

server.listen(3000);
```

### 2.2 集成 MCP Agent Core
```typescript
import { ConfigLoader } from '../../src/config/config-loader';
import { ToolAggregator } from '../../src/core/tool-aggregator';
import { XiaozhiConnection } from '../../src/core/xiaozhi-connection';

// 复用现有核心组件
const configLoader = new ConfigLoader('./config/agent-config.json');
const toolAggregator = new ToolAggregator();
const connection = new XiaozhiConnection(/* ... */);
```

### 2.3 WebSocket 实时推送
```typescript
// 监听 MCP 事件并转发到 WebSocket
connection.on('tool:called', (data) => {
  broadcast({ type: 'tool:called', payload: data });
});

toolAggregator.on('service:status', (data) => {
  broadcast({ type: 'service:status', payload: data });
});
```

**验收标准**:
- ✅ API 接口可调用
- ✅ WebSocket 连接正常
- ✅ 实时事件推送成功

---

## Phase 3: 插件市场页面 (4天)

### 3.1 SQLite 数据库
创建本地数据库：
```sql
-- 已安装的官方插件
CREATE TABLE installed_plugins (
  id VARCHAR(50) PRIMARY KEY,
  plugin_id VARCHAR(50) NOT NULL,
  name VARCHAR(100),
  version VARCHAR(20),
  config JSON NOT NULL,
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMP
);

-- 自定义插件
CREATE TABLE custom_plugins (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  config JSON NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

-- 插件缓存（来自 Registry）
CREATE TABLE plugin_cache (
  plugin_id VARCHAR(50) PRIMARY KEY,
  data JSON NOT NULL,
  cached_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### 3.2 Registry Service 集成
```typescript
// 从 Registry 获取插件列表
const REGISTRY_URL = process.env.PLUGIN_REGISTRY_URL || 
  'https://registry.mcp-agent.com';

async function fetchPluginsFromRegistry() {
  const response = await fetch(`${REGISTRY_URL}/api/registry/plugins`);
  const plugins = await response.json();
  
  // 缓存到本地数据库
  await cachePlugins(plugins);
  return plugins;
}

// 定期同步（4小时）
setInterval(fetchPluginsFromRegistry, 4 * 60 * 60 * 1000);
```

### 3.3 UI 实现
- PluginCard 组件
- 搜索/过滤功能
- 分类导航
- 详情弹窗

### 3.4 安装逻辑
```typescript
// 官方插件安装
const installRegistryPlugin = async (pluginId, version) => {
  // 1. 从 Registry 获取安装信息
  const info = await fetch(
    `${REGISTRY_URL}/api/registry/plugins/${pluginId}/download?version=${version}`
  );
  
  // 2. 保存到数据库
  await db.insertInstalledPlugin({ pluginId, version, ...info });
  
  // 3. 更新 agent-config.json
  await updateConfig(info.configTemplate);
  
  // 4. 启动服务
  await serviceManager.start(pluginId);
};

// 自定义插件添加
const addCustomPlugin = async (pluginData) => {
  // 1. 验证配置
  await validateConfig(pluginData.config);
  
  // 2. 保存到数据库
  await db.insertCustomPlugin(pluginData);
  
  // 3. 更新 agent-config.json
  await updateConfig(pluginData.config);
  
  // 4. 启动服务
  await serviceManager.start(pluginData.id);
};
```

### 3.5 导入/导出功能
```typescript
// 导出自定义插件
const exportPlugin = async (pluginId) => {
  const plugin = await db.getCustomPlugin(pluginId);
  const json = {
    format: 'mcp-agent-plugin',
    version: '1.0',
    plugin: plugin
  };
  downloadJSON(`${plugin.name}.json`, json);
};

// 导入插件
const importPlugin = async (file) => {
  const data = await parseJSON(file);
  await addCustomPlugin(data.plugin);
};
```

**验收标准**:
- ✅ 官方插件列表展示（来自 Registry）
- ✅ 自定义插件管理（本地数据库）
- ✅ 搜索/过滤工作
- ✅ 安装/卸载流程完整
- ✅ 导入/导出功能正常
- ✅ 数据持久化
- ✅ 离线缓存可用

---

## Phase 4: Xiaozhi 多服务支持 (3天) **新增阶段**

### 4.1 数据库扩展
创建多连接表：
```sql
-- Xiaozhi 连接配置
CREATE TABLE xiaozhi_connections (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  api_key VARCHAR(255),
  enabled BOOLEAN DEFAULT true,
  auto_connect BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 连接状态记录
CREATE TABLE xiaozhi_connection_status (
  connection_id VARCHAR(50) PRIMARY KEY,
  status VARCHAR(20),  -- 'connected', 'disconnected', 'error'
  uptime INTEGER,
  tool_count INTEGER,
  call_count INTEGER,
  last_error TEXT,
  updated_at TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES xiaozhi_connections(id)
);

-- 连接与服务的映射
CREATE TABLE xiaozhi_connection_services (
  connection_id VARCHAR(50),
  service_id VARCHAR(50),
  PRIMARY KEY (connection_id, service_id),
  FOREIGN KEY (connection_id) REFERENCES xiaozhi_connections(id)
);
```

### 4.2 连接管理器
```typescript
// server/src/xiaozhi/connection-manager.ts
class XiaozhiConnectionManager {
  private connections = new Map<string, XiaozhiConnection>();
  
  async addConnection(config: ConnectionConfig): Promise<string> {
    const id = generateId();
    await db.insertConnection({ id, ...config });
    return id;
  }
  
  async connectConnection(id: string): Promise<void> {
    const config = await db.getConnection(id);
    const connection = new XiaozhiConnection(config);
    
    await connection.connect();
    this.connections.set(id, connection);
    
    // 更新状态
    await db.updateConnectionStatus(id, { status: 'connected' });
    
    // 广播事件
    this.emit('connection:status', { id, status: 'connected' });
  }
  
  async disconnectConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(id);
      await db.updateConnectionStatus(id, { status: 'disconnected' });
      this.emit('connection:status', { id, status: 'disconnected' });
    }
  }
  
  getConnection(id: string): XiaozhiConnection | undefined {
    return this.connections.get(id);
  }
  
  getAllConnections(): XiaozhiConnection[] {
    return Array.from(this.connections.values());
  }
}
```

### 4.3 API 端点
```typescript
// GET /api/xiaozhi/connections
router.get('/connections', async (req, res) => {
  const connections = await db.getAllConnections();
  const statuses = await db.getAllConnectionStatuses();
  res.json({ connections, statuses });
});

// POST /api/xiaozhi/connections
router.post('/connections', async (req, res) => {
  const id = await connectionManager.addConnection(req.body);
  res.json({ id });
});

// POST /api/xiaozhi/connections/:id/connect
router.post('/connections/:id/connect', async (req, res) => {
  await connectionManager.connectConnection(req.params.id);
  res.json({ success: true });
});

// POST /api/xiaozhi/connections/:id/disconnect
router.post('/connections/:id/disconnect', async (req, res) => {
  await connectionManager.disconnectConnection(req.params.id);
  res.json({ success: true });
});

// PUT /api/xiaozhi/connections/:id/services
router.put('/connections/:id/services', async (req, res) => {
  await connectionManager.updateConnectionServices(
    req.params.id,
    req.body.serviceIds
  );
  res.json({ success: true });
});
```

### 4.4 UI 实现
```typescript
// XiaozhiConnectionsPage.tsx
const XiaozhiConnectionsPage = () => {
  const { connections, statuses } = useXiaozhiConnections();
  
  return (
    <div className="space-y-4">
      <header className="flex justify-between">
        <h1>Xiaozhi 服务</h1>
        <Button onClick={openAddDialog}>+ 添加连接</Button>
      </header>
      
      {connections.map(conn => (
        <ConnectionCard
          key={conn.id}
          connection={conn}
          status={statuses[conn.id]}
          onConnect={() => connect(conn.id)}
          onDisconnect={() => disconnect(conn.id)}
          onEdit={() => editConnection(conn.id)}
        />
      ))}
    </div>
  );
};

// ConnectionCard.tsx
const ConnectionCard = ({ connection, status, onConnect, onDisconnect, onEdit }) => {
  const isConnected = status?.status === 'connected';
  
  return (
    <Card className={isConnected ? 'border-green-500' : 'border-gray-300'}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold">{connection.name}</h3>
          <p className="text-sm text-gray-500">{connection.endpoint}</p>
          {isConnected && (
            <div className="mt-2 flex gap-4 text-sm">
              <span>在线: {formatUptime(status.uptime)}</span>
              <span>工具: {status.tool_count}</span>
              <span>调用: {status.call_count}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Button onClick={onDisconnect}>断开</Button>
              <Button onClick={() => reconnect(connection.id)}>重连</Button>
            </>
          ) : (
            <Button onClick={onConnect}>连接</Button>
          )}
          <Button onClick={onEdit}>设置</Button>
        </div>
      </div>
      
      {connection.services && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-gray-600">
            使用服务: {connection.services.join(', ')}
          </p>
        </div>
      )}
    </Card>
  );
};
```

### 4.5 工具路由更新
```typescript
// 修改 ToolAggregator 支持多连接
class ToolAggregator {
  // 指定连接调用工具
  async callTool(toolName: string, args: any, connectionId?: string) {
    if (connectionId) {
      const connection = connectionManager.getConnection(connectionId);
      return await connection.callTool(toolName, args);
    }
    
    // 未指定连接，使用默认连接或第一个激活连接
    const defaultConnection = connectionManager.getDefaultConnection();
    return await defaultConnection.callTool(toolName, args);
  }
  
  // 获取指定连接的工具列表
  async getToolsForConnection(connectionId: string) {
    const connection = connectionManager.getConnection(connectionId);
    return await connection.listTools();
  }
}
```

**验收标准**:
- ✅ 可添加多个 Xiaozhi 连接
- ✅ 每个连接独立配置服务
- ✅ 连接状态正确显示
- ✅ 可启动/停止独立连接
- ✅ 工具调用路由到正确连接
- ✅ 实时状态更新（WebSocket）
- ✅ 数据持久化

---

## Phase 5: 服务配置页面 (2天)

### 5.1 服务列表
- ServiceCard 组件
- 状态指示器
- 批量操作

### 5.2 配置表单
- 动态表单（根据 type 渲染）
- 表单验证
- 测试连接功能

### 5.3 CRUD 操作
```typescript
// 添加服务
POST /api/services
{
  "type": "stdio",
  "name": "Custom Service",
  "command": "npx",
  "args": ["..."]
}

// 启动/停止
POST /api/services/:id/start
POST /api/services/:id/stop
```

**验收标准**:
- ✅ 服务列表显示
- ✅ 添加/编辑/删除服务
- ✅ 启动/停止服务
- ✅ 配置验证

---

## Phase 6: 监控与日志 (2天)

### 6.1 监控页面
- 连接状态显示
- 统计信息卡片
- 工具列表展示

### 6.2 日志查看器
```typescript
const LogViewer = () => {
  const { logs } = useLogStore();
  
  return (
    <div className="log-viewer">
      {logs.map(log => (
        <LogEntry key={log.id} log={log} />
      ))}
    </div>
  );
};
```

### 6.3 实时更新
- WebSocket 集成
- 自动滚动
- 日志过滤

**验收标准**:
- ✅ 连接状态准确
- ✅ 日志实时显示
- ✅ 过滤功能工作
- ✅ 性能可接受

---

## Phase 7: 优化与测试 (2天)

### 7.1 性能优化
- 全局错误边界
- API 错误提示
- 重试机制

### 7.3 测试
- 单元测试（关键逻辑）
- E2E 测试（主要流程）
- 性能测试

**验收标准**:
- ✅ 页面加载 <2s
- ✅ 操作响应 <500ms
- ✅ 无内存泄漏
- ✅ 测试覆盖率 >70%

---

## 技术选型总结

| 分类 | 技术 | 理由 |
|------|------|------|
| 框架 | React 18 | 生态成熟 |
| 构建 | Vite | 快速开发 |
| 样式 | TailwindCSS | 快速开发 |
| 组件 | shadcn/ui | 高质量组件 |
| 状态 | Zustand | 轻量简单 |
| 数据 | React Query | 服务端状态管理 |
| 路由 | React Router | 标准选择 |
| 后端 | Express | 简单高效 |
| 实时 | WebSocket | 双向通信 |

## 时间估算

- Phase 1: 1天
- Phase 2: 2天
- Phase 3: 3天
- Phase 4: 3天
- Phase 5: 2天
- Phase 6: 2天
- Phase 7: 2天

**总计: 15个工作日 (约3周)**

## 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| API 集成复杂 | 高 | 提前验证接口 |
| 实时更新性能 | 中 | 限流+虚拟滚动 |
| 配置验证逻辑 | 中 | 使用 Zod schema |
| 跨平台兼容性 | 低 | 主要支持 macOS |
（项目搭建）
- Phase 2: 2天（API Server）
- Phase 3: 4天（插件市场）
- Phase 4: 3天（多 Xiaozhi 支持）**新增**
- Phase 5: 2天（服务配置）
- Phase 6: 2天（监控日志）
- Phase 7: 2天（优化测试）

**总计: 16个工作日 + 3天（多 Xiaozhi）= 19个工作日 (约4