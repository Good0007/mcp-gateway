# 插件市场架构说明

## 🎯 核心理解

### 架构分层

```
┌───────────────────────────────────────────────┐
│         B端：Plugin Registry Service          │
│         ────────────────────────────          │
│         你作为管理员发布插件的后台            │
│                                               │
│  功能:                                        │
│  • 插件发布/审核/管理                         │
│  • 版本控制                                   │
│  • 下载统计                                   │
│  • API 服务                                   │
│                                               │
│  技术栈建议:                                  │
│  • Node.js + Express                          │
│  • PostgreSQL 数据库                          │
│  • Admin Panel (React)                        │
└────────────────┬──────────────────────────────┘
                 │
                 │ HTTPS API
                 │ GET /api/registry/plugins
                 │
                 ▼
┌───────────────────────────────────────────────┐
│         C端：MCP Agent GUI                    │
│         ─────────────────────                 │
│         用户本地安装的桌面应用                │
│                                               │
│  功能:                                        │
│  • 浏览官方插件（来自 Registry）              │
│  • 安装/卸载插件                              │
│  • 创建/导入自定义插件                        │
│  • 服务配置与监控                             │
│                                               │
│  数据存储:                                    │
│  • SQLite 本地数据库                          │
│    - installed_plugins (已安装的官方插件)     │
│    - custom_plugins (用户自定义插件)          │
│    - plugin_cache (官方插件元数据缓存)        │
│                                               │
│  技术栈:                                      │
│  • Electron / Tauri (桌面应用)                │
│  • React + TypeScript                         │
│  • SQLite                                     │
└───────────────────────────────────────────────┘
```

---

## 📦 插件来源

### 1. 官方插件（来自 Registry）

**流程**:
```
1. 你在 B端管理后台发布插件
   ↓
2. 插件信息存入 Registry 数据库
   ↓
3. 用户在 C端 GUI 浏览插件市场
   ↓
4. C端通过 API 获取插件列表
   ↓
5. 用户点击"安装"
   ↓
6. C端下载配置并保存到本地数据库
   ↓
7. C端启动 MCP 服务
```

**特点**:
- ✅ 经过你的审核
- ✅ 统一的版本管理
- ✅ 可以看到下载量和评分
- ✅ 支持自动更新提醒

### 2. 自定义插件（用户本地）

**流程**:
```
1. 用户在 C端 GUI 点击"添加自定义插件"
   ↓
2. 填写插件配置表单
   ↓
3. C端验证配置有效性
   ↓
4. 保存到本地 SQLite 数据库
   ↓
5. C端启动 MCP 服务
```

**特点**:
- 👤 用户私有
- 👤 无需通过你审核
- 👤 可以导出分享给其他用户
- 👤 可以导入别人分享的插件

---

## 🔄 数据流向

### 官方插件安装流程

```
┌─────────────┐
│  你(管理员)  │
└──────┬──────┘
       │ 1. 发布插件
       ▼
┌─────────────────────────────────────┐
│   Registry Service (B端)            │
│   数据库存储:                       │
│   {                                 │
│     id: "calculator",               │
│     name: "Calculator",             │
│     version: "1.2.0",               │
│     configTemplate: {...}           │
│   }                                 │
└──────────┬──────────────────────────┘
           │ 2. API 提供数据
           │ GET /api/registry/plugins
           ▼
┌─────────────────────────────────────┐
│   用户的 MCP Agent GUI (C端)        │
│                                     │
│   1. 展示插件列表                   │
│   2. 用户点击"安装"                 │
│   3. 下载配置                       │
│   4. 保存到本地数据库:              │
│      installed_plugins 表           │
│   5. 更新 agent-config.json         │
│   6. 启动 MCP 服务                  │
└─────────────────────────────────────┘
```

### 自定义插件添加流程

```
┌─────────────────────────────────────┐
│   用户的 MCP Agent GUI (C端)        │
│                                     │
│   1. 点击"添加自定义插件"           │
│   2. 填写表单:                      │
│      - 名称                         │
│      - 连接类型 (Stdio/SSE/HTTP)    │
│      - 配置参数                     │
│   3. 验证配置                       │
│   4. 保存到本地数据库:              │
│      custom_plugins 表              │
│   5. 更新 agent-config.json         │
│   6. 启动 MCP 服务                  │
└─────────────────────────────────────┘

(不经过 Registry Service)
```

---

## 🗄️ 数据库设计

### B端：Registry Service (PostgreSQL)

```sql
-- 你管理的插件库
CREATE TABLE plugins (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  author VARCHAR(100),
  icon_url VARCHAR(255),
  category VARCHAR(50),
  official BOOLEAN,
  created_at TIMESTAMP
);

CREATE TABLE plugin_versions (
  id SERIAL PRIMARY KEY,
  plugin_id VARCHAR(50),
  version VARCHAR(20),
  config_schema JSON,
  published_at TIMESTAMP,
  downloads INT
);

CREATE TABLE plugin_ratings (
  plugin_id VARCHAR(50),
  rating INT,
  comment TEXT,
  user_id VARCHAR(50)
);
```

### C端：MCP Agent GUI (SQLite)

```sql
-- 用户安装的官方插件
CREATE TABLE installed_plugins (
  id VARCHAR(50) PRIMARY KEY,
  plugin_id VARCHAR(50),        -- 对应 Registry 的 plugins.id
  version VARCHAR(20),
  config JSON,
  installed_at TIMESTAMP
);

-- 用户的自定义插件
CREATE TABLE custom_plugins (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  config JSON,
  created_at TIMESTAMP
);

-- 缓存 Registry 的插件列表（减少 API 调用）
CREATE TABLE plugin_cache (
  plugin_id VARCHAR(50) PRIMARY KEY,
  data JSON,
  cached_at TIMESTAMP,
  expires_at TIMESTAMP          -- 4小时后过期
);
```

---

## 🔌 API 接口设计

### B端 Registry Service 需要提供的 API

```typescript
// 插件列表（分页）
GET /api/registry/plugins
Query: ?page=1&pageSize=20&category=all&sort=popular
Response: {
  total: 150,
  plugins: [
    {
      id: "calculator",
      name: "Calculator",
      version: "1.2.0",
      rating: 4.8,
      downloads: 1200,
      ...
    }
  ]
}

// 插件详情
GET /api/registry/plugins/:id
Response: {
  id: "calculator",
  name: "Calculator",
  versions: [...],
  readme: "# Calculator\n...",
  configSchema: {...}
}

// 下载配置模板
GET /api/registry/plugins/:id/download?version=1.2.0
Response: {
  configTemplate: {
    type: "sse",
    url: "http://localhost:8931/sse"
  }
}

// 记录下载（用于统计）
POST /api/registry/plugins/:id/download-count
```

### C端 MCP Agent GUI 的内部 API

```typescript
// 获取官方插件（从 Registry 或缓存）
GET /api/registry/plugins

// 安装官方插件
POST /api/plugins/install/:id
Body: { version: "1.2.0" }

// 获取已安装列表
GET /api/installed-plugins

// 卸载插件
DELETE /api/installed-plugins/:id

// 添加自定义插件
POST /api/custom-plugins
Body: {
  name: "My Plugin",
  config: {...}
}

// 导出自定义插件
GET /api/custom-plugins/:id/export
Response: JSON 文件

// 导入自定义插件
POST /api/custom-plugins/import
Body: FormData (JSON 文件)
```

---

## 🎨 UI 界面设计

### 插件市场页面

```
┌──────────────────────────────────────────────┐
│  MCP Agent - 插件市场                        │
├──────────────────────────────────────────────┤
│  🔍 [搜索插件...]    [分类▼] [排序▼] [🔄]   │
├──────────────────────────────────────────────┤
│  标签页: [官方插件] [我的自定义]             │
├──────────────────────────────────────────────┤
│                                              │
│  === 官方插件 (来自 Registry Service) ===   │
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ 🎖️ 官方      │  │ 🎖️ 官方      │        │
│  │ 🧮 Calculator│  │ 🗄️ Filesystem│        │
│  │              │  │              │        │
│  │ v1.2.0       │  │ v2.1.0       │        │
│  │ ⭐ 4.8 (324) │  │ ⭐ 4.9 (512) │        │
│  │ 📥 1,200下载 │  │ 📥 2,500下载 │        │
│  │              │  │              │        │
│  │ [✓ 已安装]   │  │ [  安装  ]   │        │
│  │ [  详情  ]   │  │ [  详情  ]   │        │
│  └──────────────┘  └──────────────┘        │
│                                              │
│  === 我的自定义插件 ===                      │
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ 👤 自定义     │  │ 👤 自定义     │        │
│  │ 🤖 My AI Bot │  │ 🎨 ImageGen  │        │
│  │              │  │              │        │
│  │ 本地创建     │  │ 从文件导入   │        │
│  │ 2026-02-10   │  │ 2026-02-12   │        │
│  │              │  │              │        │
│  │ [  编辑  ]   │  │ [  编辑  ]   │        │
│  │ [  导出  ]   │  │ [  删除  ]   │        │
│  └──────────────┘  └──────────────┘        │
│                                              │
│  [+ 添加自定义插件] [📥 导入插件文件]        │
└──────────────────────────────────────────────┘
```

---

## 🎯 关键点总结

### ✅ 你需要做的（B端）

1. **创建 Plugin Registry Service**
   - 后台管理界面（发布/编辑/删除插件）
   - REST API（提供插件列表给 C端）
   - PostgreSQL 数据库
   - 部署到服务器（例如：`https://registry.mcp-agent.com`）

2. **插件发布流程**
   - 填写插件信息（名称、描述、图标）
   - 上传配置模板
   - 设置版本号
   - 审核后发布

### ✅ 用户可以做的（C端）

1. **安装官方插件**
   - 浏览你发布的插件
   - 一键安装到本地
   - 自动配置和启动

2. **创建自定义插件**
   - 手动填写配置
   - 不需要经过你审核
   - 仅在本地使用

3. **分享自定义插件**
   - 导出为 `.json` 文件
   - 发给其他用户
   - 其他用户导入后使用

---

## 📝 实施建议

### 阶段 1: 先做 C端（MCP Agent GUI）
- 可以先硬编码一些插件数据测试
- 先实现自定义插件功能
- 验证整个流程可行

### 阶段 2: 再做 B端（Registry Service）
- 搭建简单的管理后台
- 提供 API 接口
- C端对接 API

### 阶段 3: 完善功能
- 评分系统
- 自动更新检查
- 插件推荐算法

---

需要我详细说明某个部分吗？
