# 插件市场架构设计

## 整体架构

```
┌──────────────────────────────────────────────┐
│        Plugin Registry Service (B端)         │
│        后台管理 + API 服务                    │
│  ┌────────────┐         ┌─────────────────┐ │
│  │  管理后台   │         │   REST API      │ │
│  │  发布/审核  │────────▶│  /api/registry  │ │
│  │  版本管理   │         │                 │ │
│  └────────────┘         └─────────────────┘ │
│         │                        │           │
│         ▼                        │           │
│  ┌────────────────────────────┐  │           │
│  │   Database (PostgreSQL)    │  │           │
│  │   - plugins                │  │           │
│  │   - versions               │  │           │
│  │   - categories             │  │           │
│  └────────────────────────────┘  │           │
└────────────────────────────────────┼──────────┘
                                    │
                         HTTPS      │
                                    ▼
┌───────────────────────────────────────────────┐
│         MCP Agent GUI (C端)                   │
│         用户本地应用                           │
│  ┌──────────────────────────────────────────┐ │
│  │  插件市场页面                             │ │
│  │  ┌────────────┐    ┌──────────────────┐ │ │
│  │  │ 官方插件   │    │  自定义插件      │ │ │
│  │  │ (Registry) │    │  (本地数据库)    │ │ │
│  │  └────────────┘    └──────────────────┘ │ │
│  └──────────────────────────────────────────┘ │
│         │                        │             │
│         ▼                        ▼             │
│  ┌──────────────────────────────────────────┐ │
│  │   Local Database (SQLite)                │ │
│  │   - installed_plugins (官方)             │ │
│  │   - custom_plugins (自定义)              │ │
│  │   - plugin_cache (元数据缓存)            │ │
│  └──────────────────────────────────────────┘ │
│         │                                      │
│         ▼                                      │
│  ┌──────────────────────────────────────────┐ │
│  │   MCP Agent Core                         │ │
│  │   ToolAggregator + ServiceAdapters       │ │
│  └──────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

---

## 插件分类

### 1. 官方插件（Registry Plugins）
- **来源**: Plugin Registry Service
- **特点**:
  - 经过审核
  - 版本管理
  - 自动更新
  - 统计数据（下载量、评分）
- **安装流程**:
  1. 从 Registry 获取元数据
  2. 下载到本地
  3. 记录到 `installed_plugins` 表
  4. 启用服务

### 2. 自定义插件（Custom Plugins）
- **来源**: 用户本地创建/导入
- **特点**:
  - 无需审核
  - 用户自行管理
  - 不支持自动更新
  - 可导出分享
- **添加流程**:
  1. 用户填写配置表单
  2. 验证配置正确性
  3. 保存到 `custom_plugins` 表
  4. 启用服务

---

## Plugin Registry Service (B端)

### 数据库设计

```sql
-- 插件表
CREATE TABLE plugins (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  author VARCHAR(100),
  icon_url VARCHAR(255),
  category VARCHAR(50),
  tags JSON,
  official BOOLEAN DEFAULT false,
  homepage VARCHAR(255),
  repository VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 版本表
CREATE TABLE plugin_versions (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(50) REFERENCES plugins(id),
  version VARCHAR(20) NOT NULL,
  config_schema JSON NOT NULL,
  install_methods JSON NOT NULL,
  dependencies JSON,
  readme TEXT,
  published_at TIMESTAMP,
  downloads INT DEFAULT 0
);

-- 评分表
CREATE TABLE plugin_ratings (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(50) REFERENCES plugins(id),
  user_id VARCHAR(50),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP
);

-- 分类表
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  icon VARCHAR(50),
  sort_order INT
);
```

### API 接口

```typescript
// 插件列表（分页）
GET /api/registry/plugins?page=1&pageSize=20&category=all&sort=popular

Response:
{
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "plugins": [
    {
      "id": "calculator",
      "name": "Calculator",
      "description": "数学计算服务",
      "icon": "🧮",
      "category": "tools",
      "tags": ["计算", "数学"],
      "official": true,
      "rating": 4.8,
      "downloads": 1200,
      "latestVersion": "1.2.0",
      "author": "MCP Team"
    }
  ]
}

// 插件详情
GET /api/registry/plugins/:id

Response:
{
  "id": "calculator",
  "name": "Calculator",
  "description": "...",
  "versions": [
    {
      "version": "1.2.0",
      "publishedAt": "2026-02-10",
      "configSchema": { ... },
      "installMethods": ["sse", "stdio"],
      "readme": "# Calculator\n..."
    }
  ],
  "stats": {
    "downloads": 1200,
    "rating": 4.8,
    "ratingCount": 324
  }
}

// 搜索插件
GET /api/registry/plugins/search?q=calculator

// 分类列表
GET /api/registry/categories

// 插件下载（返回配置模板）
GET /api/registry/plugins/:id/download?version=1.2.0

Response:
{
  "id": "calculator",
  "version": "1.2.0",
  "configTemplate": {
    "type": "sse",
    "url": "http://localhost:8931/sse"
  },
  "installScript": "npm install -g calculator-mcp"
}
```

---

## MCP Agent GUI (C端)

### 本地数据库设计（SQLite）

```sql
-- 已安装的官方插件
CREATE TABLE installed_plugins (
  id VARCHAR(50) PRIMARY KEY,
  plugin_id VARCHAR(50) NOT NULL,      -- Registry 插件 ID
  name VARCHAR(100),
  version VARCHAR(20),
  config JSON NOT NULL,
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- 自定义插件
CREATE TABLE custom_plugins (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  config JSON NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- 插件元数据缓存（减少 API 调用）
CREATE TABLE plugin_cache (
  plugin_id VARCHAR(50) PRIMARY KEY,
  data JSON NOT NULL,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```

### 数据同步策略

```typescript
// 启动时同步
async function syncPlugins() {
  const lastSync = await getLastSyncTime();
  
  if (Date.now() - lastSync > 1 * 60 * 60 * 1000) { // 1小时
    try {
      const plugins = await fetchFromRegistry('/api/registry/plugins');
      await updateCache(plugins);
      await setLastSyncTime(Date.now());
    } catch (error) {
      // 使用缓存数据
      console.warn('Failed to sync, using cache');
    }
  }
}

// 后台定期同步
setInterval(syncPlugins, 4 * 60 * 60 * 1000); // 4小时
```

---

## UI 设计更新

### 插件市场页面

```
┌────────────────────────────────────────────────┐
│  🔍 [搜索框]      [分类▼] [排序▼] [刷新]      │
├────────────────────────────────────────────────┤
│  [官方插件] [我的自定义]                       │
├────────────────────────────────────────────────┤
│  📦 官方推荐  🌟 热门  🆕 最新  ⚡ 已安装      │
├────────────────────────────────────────────────┤
│                                                │
│  官方插件 (来自 Plugin Registry)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 🎖️ 官方  │  │ 🎖️ 官方  │  │         │    │
│  │ 🧮       │  │ 🗄️       │  │ 🔍      │    │
│  │Calculator│  │Filesystem│  │ Search  │    │
│  │ v1.2.0   │  │ v2.1.0   │  │ v1.0.5  │    │
│  │ ⭐ 4.8   │  │ ⭐ 4.9   │  │ ⭐ 4.7  │    │
│  │ 📥 1.2k  │  │ 📥 2.5k  │  │ 📥 890  │    │
│  │ [✓ 已装] │  │ [安装]   │  │ [安装]  │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│  我的自定义插件                                │
│  ┌──────────┐  ┌──────────┐                  │
│  │ 👤 自定义 │  │ 👤 自定义 │                  │
│  │ 🤖       │  │ 🎨       │      [+ 添加]    │
│  │My Custom │  │My AI Bot │                  │
│  │          │  │          │                  │
│  │ [编辑]   │  │ [编辑]   │                  │
│  └──────────┘  └──────────┘                  │
└────────────────────────────────────────────────┘
```

### 插件卡片区分

**官方插件卡片**:
```tsx
{
  id: "calculator",
  source: "registry",           // 标识来源
  registryId: "calculator",     // Registry ID
  name: "Calculator",
  version: "1.2.0",
  official: true,
  rating: 4.8,
  downloads: 1200,
  installed: true,
  canUpdate: false,             // 是否有新版本
}
```

**自定义插件卡片**:
```tsx
{
  id: "local-custom-1",
  source: "custom",              // 标识来源
  name: "My Custom Plugin",
  description: "用户自定义描述",
  icon: "🤖",
  config: { type: "http", ... },
  canExport: true,               // 可导出分享
}
```

---

## 安装流程对比

### 官方插件安装

```typescript
async function installRegistryPlugin(pluginId: string, version: string) {
  // 1. 从 Registry 获取安装信息
  const installInfo = await fetch(
    `${REGISTRY_URL}/api/registry/plugins/${pluginId}/download?version=${version}`
  ).then(r => r.json());
  
  // 2. 执行安装脚本（如果需要）
  if (installInfo.installScript) {
    await execCommand(installInfo.installScript);
  }
  
  // 3. 保存配置到本地数据库
  await db.insertInstalledPlugin({
    pluginId,
    version,
    config: installInfo.configTemplate,
    enabled: true,
  });
  
  // 4. 更新 agent-config.json
  await addServiceToConfig({
    id: pluginId,
    ...installInfo.configTemplate,
  });
  
  // 5. 启动服务
  await serviceManager.startService(pluginId);
  
  // 6. 通知 Registry（统计下载量）
  await fetch(`${REGISTRY_URL}/api/registry/plugins/${pluginId}/download-count`, {
    method: 'POST',
  });
}
```

### 自定义插件添加

```typescript
async function addCustomPlugin(pluginData: CustomPlugin) {
  // 1. 验证配置
  const validation = await validateConfig(pluginData.config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // 2. 测试连接
  const testResult = await testConnection(pluginData.config);
  if (!testResult.success) {
    throw new Error('连接测试失败');
  }
  
  // 3. 保存到本地数据库
  const id = generateId();
  await db.insertCustomPlugin({
    id,
    ...pluginData,
  });
  
  // 4. 更新 agent-config.json
  await addServiceToConfig({
    id,
    ...pluginData.config,
  });
  
  // 5. 启动服务
  await serviceManager.startService(id);
}
```

---

## 配置文件结构

```json
{
  "xiaozhi": {
    "endpoint": "wss://api.xiaozhi.me/mcp/"
  },
  "registry": {
    "url": "https://registry.mcp-agent.com",
    "syncInterval": 14400000,
    "cacheEnabled": true
  },
  "services": [
    {
      "id": "calculator",
      "source": "registry",
      "registryId": "calculator",
      "version": "1.2.0",
      "type": "sse",
      "enabled": true,
      "url": "http://localhost:8931/sse"
    },
    {
      "id": "custom-my-service",
      "source": "custom",
      "type": "http",
      "enabled": true,
      "baseUrl": "http://localhost:8080"
    }
  ]
}
```

---

## 更新检查机制

```typescript
// 定期检查官方插件更新
async function checkUpdates() {
  const installedPlugins = await db.getInstalledPlugins();
  
  for (const plugin of installedPlugins) {
    const latestVersion = await fetchLatestVersion(plugin.registryId);
    
    if (compareVersions(latestVersion, plugin.version) > 0) {
      // 有新版本
      await db.markPluginHasUpdate(plugin.id, latestVersion);
      
      // 显示更新提示
      showNotification({
        title: `${plugin.name} 有新版本`,
        message: `${plugin.version} → ${latestVersion}`,
        action: '立即更新',
      });
    }
  }
}
```

---

## 导入/导出自定义插件

### 导出格式

```json
{
  "format": "mcp-agent-plugin",
  "version": "1.0",
  "plugin": {
    "name": "My Custom Plugin",
    "description": "自定义插件描述",
    "icon": "🤖",
    "config": {
      "type": "http",
      "baseUrl": "http://localhost:8080",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    },
    "metadata": {
      "author": "User Name",
      "createdAt": "2026-02-15T10:00:00Z"
    }
  }
}
```

### 导入流程

```typescript
async function importPlugin(file: File) {
  // 1. 解析 JSON
  const pluginData = await parsePluginFile(file);
  
  // 2. 验证格式
  if (pluginData.format !== 'mcp-agent-plugin') {
    throw new Error('不支持的插件格式');
  }
  
  // 3. 检查重复
  const existing = await db.findPluginByName(pluginData.plugin.name);
  if (existing) {
    const confirmed = await confirm('插件已存在，是否覆盖？');
    if (!confirmed) return;
  }
  
  // 4. 添加插件
  await addCustomPlugin(pluginData.plugin);
}
```

---

## 环境变量配置

```bash
# .env
# Plugin Registry 配置
PLUGIN_REGISTRY_URL=https://registry.mcp-agent.com
PLUGIN_REGISTRY_API_KEY=your_api_key_here

# 可选：私有 Registry
PRIVATE_REGISTRY_URL=https://company-registry.internal
PRIVATE_REGISTRY_TOKEN=your_token_here
```

---

## 安全考虑

1. **Registry API 认证**: 使用 API Key
2. **HTTPS 通信**: 所有 Registry 请求使用 HTTPS
3. **插件签名**: 官方插件数字签名验证
4. **沙箱执行**: 自定义插件在受限环境运行
5. **权限管理**: 用户确认高风险操作
