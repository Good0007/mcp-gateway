# MCP Agent GUI架构设计

> 版本：v0.2.0（规划）  
> 日期：2026-02-14  
> 状态：设计阶段

## 1. GUI功能需求

### 1.1 核心功能

#### 插件市场
- 📦 浏览可用的MCP服务列表
- 🔍 搜索和筛选MCP服务
- ℹ️ 查看服务详情（描述、工具列表、版本）
- ⭐ 服务评分和推荐

#### 插件管理
- ✅ 一键安装MCP服务
- ⚙️ 配置服务参数（命名空间、环境变量等）
- 🔄 启用/禁用服务
- 🗑️ 卸载服务
- 🔄 更新服务版本

#### 小智连接管理
- 🔌 配置小智端点
- 🟢 连接状态显示
- 📊 连接质量监控（延迟、重连次数）
- 🔐 Token管理

#### 服务监控
- 📈 实时服务状态
- 📝 日志查看器
- 🛠️ 工具调用统计
- ⚠️ 错误告警

## 2. 架构解耦设计

### 2.1 当前核心架构回顾

```
┌─────────────────────────────────────┐
│      MCPAgentManager (核心)         │
├─────────────────────────────────────┤
│  - ServiceRegistry                  │
│  - ToolAggregator                   │
│  - XiaozhiWebSocketClient          │
│  - ConfigManager                    │
└─────────────────────────────────────┘
```

**优点**：
- ✅ 核心功能已经良好解耦
- ✅ 可以独立运行（CLI模式）
- ✅ 不依赖GUI

### 2.2 GUI扩展架构

```
┌─────────────────────────────────────────────────┐
│              GUI Layer (新增)                    │
│  ┌──────────────┐  ┌──────────────────┐        │
│  │  Web UI      │  │  Electron App    │        │
│  │  (React/Vue) │  │  (桌面应用)       │        │
│  └──────┬───────┘  └──────┬───────────┘        │
│         │                  │                     │
│         └──────────┬───────┘                     │
│                    │                             │
└────────────────────┼─────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼─────────────────────────────┐
│           API Server Layer (新增)                │
│  ┌──────────────────────────────────────┐       │
│  │  Express Server                      │       │
│  │  - REST API endpoints                │       │
│  │  - WebSocket (实时状态推送)          │       │
│  │  - 身份认证                           │       │
│  └──────────────┬───────────────────────┘       │
└─────────────────┼───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│        UI Controller Layer (新增)               │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │  PluginManager   │  │  ConnectionMgr   │    │
│  │  - 安装/卸载      │  │  - 连接管理      │    │
│  │  - 市场同步       │  │  - 状态监控      │    │
│  └──────────────────┘  └──────────────────┘    │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │  ServiceController│  │  MonitoringMgr   │    │
│  │  - 启用/禁用      │  │  - 日志收集      │    │
│  │  - 配置管理       │  │  - 指标统计      │    │
│  └──────────────────┘  └──────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Core Layer (现有核心不变)                │
│            MCPAgentManager                      │
└─────────────────────────────────────────────────┘
```

### 2.3 关键解耦点

#### 解耦点1：核心与UI完全分离

**设计原则**：核心层不依赖GUI层

```typescript
// ✅ 正确：核心层可独立使用
const manager = new MCPAgentManager(config);
await manager.start(); // CLI模式

// ✅ 正确：GUI层调用核心层
class APIServer {
  constructor(private manager: MCPAgentManager) {}
}
```

```typescript
// ❌ 错误：核心层依赖GUI
class MCPAgentManager {
  constructor(private uiServer?: UIServer) {} // 不应该有这种依赖
}
```

#### 解耦点2：插件安装与服务运行分离

**PluginManager**（负责安装/卸载）
```typescript
class PluginManager {
  // 安装插件（不启动）
  async install(pluginName: string, version?: string): Promise<void> {
    // 1. 从npm/registry下载
    // 2. 安装依赖
    // 3. 验证插件
    // 4. 添加到可用插件列表
    // ⚠️ 不自动启动服务
  }
  
  // 卸载插件
  async uninstall(pluginName: string): Promise<void> {
    // 1. 检查是否正在使用
    // 2. 删除插件文件
    // 3. 从列表移除
  }
  
  // 列出已安装插件
  listInstalled(): PluginInfo[];
  
  // 同步插件市场
  async syncMarket(): Promise<PluginInfo[]>;
}
```

**ServiceController**（负责启用/禁用）
```typescript
class ServiceController {
  constructor(
    private manager: MCPAgentManager,
    private configManager: ConfigManager
  ) {}
  
  // 启用服务（使用已安装的插件）
  async enableService(serviceName: string, config: ServiceConfig): Promise<void> {
    // 1. 更新配置文件（enabled: true）
    // 2. 配置管理器自动触发重载
    // 3. MCPAgentManager创建并启动服务
  }
  
  // 禁用服务
  async disableService(serviceName: string): Promise<void> {
    // 1. 更新配置文件（enabled: false）
    // 2. 触发配置重载
    // 3. MCPAgentManager停止服务
  }
  
  // 更新服务配置
  async updateServiceConfig(serviceName: string, config: Partial<ServiceConfig>): Promise<void>;
}
```

**分离优势**：
- ✅ 可以安装插件但不启用
- ✅ 可以快速启用/禁用而无需重新安装
- ✅ 卸载时自动检查是否在使用

#### 解耦点3：小智连接独立控制

**ConnectionManager**（管理小智连接）
```typescript
class ConnectionManager {
  constructor(private wsClient: XiaozhiWebSocketClient) {}
  
  // 连接到小智
  async connect(endpoint: string): Promise<void> {
    // 更新配置
    // 触发WebSocket连接
  }
  
  // 断开连接
  async disconnect(): Promise<void> {
    // 断开WebSocket
    // 服务继续运行（本地测试模式）
  }
  
  // 获取连接状态
  getStatus(): ConnectionStatus {
    return {
      connected: boolean,
      endpoint: string,
      latency: number,
      reconnectCount: number
    };
  }
}
```

**关键设计**：
- ✅ 小智连接可以独立开启/关闭
- ✅ 关闭连接不影响本地服务运行（本地测试）
- ✅ 服务启用/禁用不影响连接状态

## 3. GUI功能实现方案

### 3.1 插件市场

#### 市场数据源设计

```typescript
interface PluginMarketSource {
  type: 'npm' | 'github' | 'custom';
  url: string;
}

interface PluginInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  homepage: string;
  repository: string;
  
  // MCP特定信息
  type: 'stdio' | 'embedded';
  tools: ToolInfo[];
  
  // 安装信息
  installCommand?: string;  // stdio类型
  npmPackage?: string;      // embedded类型
  
  // 元信息
  downloads: number;
  rating: number;
  tags: string[];
  
  // 状态
  installed: boolean;
  enabled: boolean;
}
```

#### 插件来源

1. **官方MCP插件列表**
   ```typescript
   const officialSource = {
     type: 'github',
     url: 'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/registry.json'
   };
   ```

2. **npm搜索**
   ```typescript
   async searchNpm(keyword: string): Promise<PluginInfo[]> {
     const results = await fetch(`https://registry.npmjs.org/-/v1/search?text=${keyword}+mcp`);
     // 过滤和转换
   }
   ```

3. **自定义源**
   ```json
   {
     "customSources": [
       "https://my-company.com/mcp-plugins.json"
     ]
   }
   ```

### 3.2 一键安装流程

```typescript
class PluginInstaller {
  async installPlugin(plugin: PluginInfo): Promise<InstallResult> {
    // 1. 下载前检查
    await this.checkDependencies(plugin);
    
    // 2. 下载安装
    if (plugin.type === 'embedded') {
      await this.installNpmPackage(plugin.npmPackage);
    } else if (plugin.type === 'stdio') {
      await this.downloadAndExtract(plugin);
    }
    
    // 3. 验证安装
    const valid = await this.verifyInstallation(plugin);
    if (!valid) {
      await this.rollback(plugin);
      throw new Error('Installation verification failed');
    }
    
    // 4. 注册到可用列表
    await this.registerPlugin(plugin);
    
    // 5. 🔴 不自动启用，由用户决定
    
    return { success: true, plugin };
  }
}
```

### 3.3 配置流程

#### 安装后配置

```typescript
// GUI流程
async function onPluginInstalled(plugin: PluginInfo) {
  // 1. 显示配置向导
  const config = await showConfigWizard({
    plugin,
    defaults: {
      namespace: generateNamespace(plugin.name),
      enabled: false  // 默认不启用
    }
  });
  
  // 2. 保存配置（不启用）
  await serviceController.addServiceConfig(config);
  
  // 3. 询问是否立即启用
  const shouldEnable = await confirm('是否立即启用此服务？');
  if (shouldEnable) {
    await serviceController.enableService(config.name);
  }
}
```

#### 配置模板

```typescript
interface ConfigTemplate {
  plugin: PluginInfo;
  fields: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'path';
  required: boolean;
  default?: any;
  description?: string;
  options?: any[];  // for select
}

// 示例：文件系统服务配置
const filesystemTemplate: ConfigTemplate = {
  plugin: { /* ... */ },
  fields: [
    {
      key: 'namespace',
      label: '命名空间',
      type: 'string',
      required: true,
      default: 'fs',
      description: '工具名前缀，避免冲突'
    },
    {
      key: 'allowedDirectories',
      label: '允许访问的目录',
      type: 'path',
      required: true,
      description: '出于安全考虑，限制可访问的目录'
    },
    {
      key: 'readOnly',
      label: '只读模式',
      type: 'boolean',
      required: false,
      default: false
    }
  ]
};
```

### 3.4 启用/禁用流程

```typescript
class ServiceController {
  // 启用服务
  async enableService(serviceName: string): Promise<void> {
    // 1. 检查配置是否存在
    const config = await this.configManager.getServiceConfig(serviceName);
    if (!config) {
      throw new Error('Service configuration not found');
    }
    
    // 2. 检查插件是否已安装
    const installed = await this.pluginManager.isInstalled(config.module || config.command);
    if (!installed) {
      throw new Error('Plugin not installed');
    }
    
    // 3. 更新配置
    config.enabled = true;
    await this.configManager.updateServiceConfig(serviceName, config);
    
    // 4. ConfigWatcher自动触发重载
    // 5. MCPAgentManager创建并启动服务
    
    // 6. 等待服务启动完成
    await this.waitForServiceReady(serviceName, 10000);
  }
  
  // 禁用服务
  async disableService(serviceName: string): Promise<void> {
    // 1. 更新配置
    const config = await this.configManager.getServiceConfig(serviceName);
    config.enabled = false;
    await this.configManager.updateServiceConfig(serviceName, config);
    
    // 2. ConfigWatcher自动触发重载
    // 3. MCPAgentManager停止服务
    
    // 4. 等待服务停止
    await this.waitForServiceStopped(serviceName, 5000);
  }
}
```

### 3.5 卸载流程

```typescript
class PluginManager {
  async uninstall(pluginName: string): Promise<void> {
    // 1. 检查是否有服务在使用
    const services = await this.findServicesUsingPlugin(pluginName);
    if (services.length > 0) {
      // 询问用户
      const confirmed = await confirm(
        `以下服务正在使用此插件：\n${services.join(', ')}\n是否禁用这些服务并卸载？`
      );
      
      if (!confirmed) {
        throw new Error('Uninstall cancelled');
      }
      
      // 禁用所有相关服务
      for (const service of services) {
        await this.serviceController.disableService(service);
      }
    }
    
    // 2. 删除插件文件
    if (pluginType === 'embedded') {
      await this.uninstallNpmPackage(pluginName);
    } else {
      await this.removePluginFiles(pluginName);
    }
    
    // 3. 从注册表移除
    await this.unregisterPlugin(pluginName);
    
    // 4. 清理配置（可选，询问用户）
    const shouldRemoveConfig = await confirm('是否删除相关服务配置？');
    if (shouldRemoveConfig) {
      for (const service of services) {
        await this.configManager.removeServiceConfig(service);
      }
    }
  }
}
```

## 4. API设计

### 4.1 REST API端点

```typescript
// 插件管理
GET    /api/plugins/market          // 获取插件市场列表
GET    /api/plugins/installed       // 获取已安装插件
POST   /api/plugins/install         // 安装插件
DELETE /api/plugins/:id             // 卸载插件
GET    /api/plugins/:id/info        // 获取插件详情

// 服务管理
GET    /api/services                // 获取所有服务配置
GET    /api/services/:name          // 获取服务详情
POST   /api/services                // 添加服务配置
PUT    /api/services/:name          // 更新服务配置
DELETE /api/services/:name          // 删除服务配置
POST   /api/services/:name/enable   // 启用服务
POST   /api/services/:name/disable  // 禁用服务
GET    /api/services/:name/status   // 获取服务状态

// 连接管理
GET    /api/connection/status       // 获取连接状态
POST   /api/connection/connect      // 连接小智
POST   /api/connection/disconnect   // 断开连接
PUT    /api/connection/config       // 更新连接配置

// 监控
GET    /api/monitoring/services     // 服务健康状态
GET    /api/monitoring/tools        // 工具调用统计
GET    /api/monitoring/logs         // 获取日志
WS     /api/monitoring/realtime     // 实时状态推送

// 配置
GET    /api/config                  // 获取完整配置
PUT    /api/config                  // 更新配置
POST   /api/config/reload           // 手动重载配置
```

### 4.2 API使用示例

```typescript
// 前端代码示例

// 1. 浏览并安装插件
async function installPluginFromMarket(pluginId: string) {
  // 获取插件详情
  const plugin = await fetch(`/api/plugins/market/${pluginId}`).then(r => r.json());
  
  // 显示确认对话框
  if (!await confirmInstall(plugin)) return;
  
  // 安装
  const result = await fetch('/api/plugins/install', {
    method: 'POST',
    body: JSON.stringify({ pluginId, version: plugin.version })
  }).then(r => r.json());
  
  // 显示配置向导
  const config = await showConfigWizard(plugin);
  
  // 创建服务配置
  await fetch('/api/services', {
    method: 'POST',
    body: JSON.stringify(config)
  });
  
  // 询问是否启用
  if (await confirm('立即启用？')) {
    await fetch(`/api/services/${config.name}/enable`, { method: 'POST' });
  }
}

// 2. 启用/禁用服务
async function toggleService(serviceName: string, enabled: boolean) {
  const endpoint = enabled ? 'enable' : 'disable';
  await fetch(`/api/services/${serviceName}/${endpoint}`, { method: 'POST' });
  
  // 刷新状态
  await refreshServiceList();
}

// 3. 连接/断开小智
async function toggleXiaozhiConnection(connect: boolean) {
  const endpoint = connect ? 'connect' : 'disconnect';
  await fetch(`/api/connection/${endpoint}`, { method: 'POST' });
  
  // 订阅实时状态
  if (connect) {
    subscribeToRealtimeStatus();
  }
}
```

## 5. 数据流和状态管理

### 5.1 状态层级

```
┌─────────────────────────────────┐
│    Application State (前端)      │
│  - 插件市场数据                   │
│  - 已安装插件列表                 │
│  - 服务配置列表                   │
│  - 服务运行状态                   │
│  - 连接状态                       │
│  - 日志和指标                     │
└──────────────┬──────────────────┘
               │ REST API / WebSocket
┌──────────────▼──────────────────┐
│   Backend State (API Server)    │
│  - 插件注册表                     │
│  - 配置文件                       │
│  - 运行时状态                     │
└──────────────┬──────────────────┘
               │ 方法调用
┌──────────────▼──────────────────┐
│     Core State (MCPAgent)       │
│  - ServiceRegistry               │
│  - ToolAggregator                │
│  - WebSocketClient               │
└─────────────────────────────────┘
```

### 5.2 状态同步机制

```typescript
// 实时状态推送（WebSocket）
class RealtimeMonitor {
  private ws: WebSocket;
  
  subscribe() {
    this.ws = new WebSocket('/api/monitoring/realtime');
    
    this.ws.on('message', (data) => {
      const event = JSON.parse(data);
      
      switch (event.type) {
        case 'service-status-changed':
          this.handleServiceStatusChange(event.data);
          break;
        case 'connection-status-changed':
          this.handleConnectionStatusChange(event.data);
          break;
        case 'tool-called':
          this.handleToolCall(event.data);
          break;
        case 'log-entry':
          this.handleLogEntry(event.data);
          break;
      }
    });
  }
}
```

## 6. 配置文件管理策略

### 6.1 配置持久化

```typescript
class ConfigManager {
  private configPath: string;
  private config: MCPAgentConfig;
  
  // 读取配置
  async load(): Promise<MCPAgentConfig> {
    const content = await fs.readFile(this.configPath, 'utf-8');
    this.config = JSON.parse(content);
    return this.config;
  }
  
  // 更新单个服务配置
  async updateServiceConfig(name: string, config: Partial<ServiceConfig>): Promise<void> {
    // 1. 更新内存中的配置
    this.config.services[name] = {
      ...this.config.services[name],
      ...config
    };
    
    // 2. 写入文件（原子操作）
    await this.saveAtomic();
    
    // 3. ConfigWatcher会自动触发重载
  }
  
  // 原子保存（避免损坏）
  private async saveAtomic(): Promise<void> {
    const tempPath = `${this.configPath}.tmp`;
    
    // 写入临时文件
    await fs.writeFile(tempPath, JSON.stringify(this.config, null, 2));
    
    // 原子替换
    await fs.rename(tempPath, this.configPath);
  }
}
```

### 6.2 配置版本控制（可选）

```typescript
interface ConfigSnapshot {
  timestamp: Date;
  config: MCPAgentConfig;
  reason: string;  // 'user-edit', 'auto-backup', 'before-install', etc.
}

class ConfigVersionControl {
  private snapshotsDir: string;
  
  // 创建快照
  async snapshot(config: MCPAgentConfig, reason: string): Promise<void> {
    const snapshot: ConfigSnapshot = {
      timestamp: new Date(),
      config,
      reason
    };
    
    const filename = `config-${Date.now()}.json`;
    await fs.writeFile(
      path.join(this.snapshotsDir, filename),
      JSON.stringify(snapshot, null, 2)
    );
  }
  
  // 恢复快照
  async restore(timestamp: number): Promise<void>;
  
  // 列出快照
  async list(): Promise<ConfigSnapshot[]>;
}
```

## 7. 解耦性总结

### ✅ 已实现的解耦

1. **核心与GUI分离**
   - 核心可独立运行（CLI模式）
   - GUI通过API调用核心

2. **插件安装与服务运行分离**
   - 可以安装但不启用
   - 安装和启用是独立操作

3. **配置与运行分离**
   - 配置更新通过文件
   - ConfigWatcher触发自动重载

4. **连接与服务分离**
   - 小智连接可独立控制
   - 断开连接不影响本地服务

### 🎯 合理性评估

| 功能 | 合理性 | 说明 |
|-----|--------|------|
| 勾选自动安装MCP | ✅ 合理 | PluginManager独立处理 |
| 选择开启接入小智 | ✅ 合理 | ConnectionManager独立控制 |
| 卸载操作 | ✅ 合理 | 检查依赖后安全卸载 |
| 启用/禁用服务 | ✅ 合理 | ServiceController管理配置 |
| 配置编辑 | ✅ 合理 | ConfigManager原子更新 |

### 🏆 设计优势

1. **关注点分离**：每个管理器负责单一职责
2. **松耦合**：组件间通过接口和事件通信
3. **易测试**：每个组件可独立测试
4. **可扩展**：新增功能不影响现有代码
5. **用户友好**：流程清晰，操作直观

### 📋 实施建议

1. **Phase 1（v0.1.0）**：核心功能，CLI模式
2. **Phase 2（v0.2.0）**：
   - 添加PluginManager
   - 添加ServiceController
   - 添加REST API Server
3. **Phase 3（v0.3.0）**：
   - Web UI实现
   - 插件市场集成
4. **Phase 4（v1.0.0）**：
   - Electron桌面应用（可选）
   - 完整的监控和日志

---

**文档维护**：
- 创建日期：2026-02-14
- 最后更新：2026-02-14
- 审核状态：待审核
