# GUI 管理页面设计文档

## 📚 文档导航

### 核心文档
1. **[OVERVIEW.md](./OVERVIEW.md)** - 总览
   - 架构设计
   - 技术栈
   - 核心功能
   - 目录结构

2. **[PLUGIN-REGISTRY.md](./PLUGIN-REGISTRY.md)** - 插件市场架构 ⭐
   - Registry Service（B端）设计
   - 数据库设计
   - API 接口
   - 官方插件 vs 自定义插件
   - 安装/导入/导出流程

3. **[MULTI-XIAOZHI.md](./MULTI-XIAOZHI.md)** - 多 Xiaozhi 服务支持 ⭐ 新增
   - 多实例连接管理
   - 不同工具集配置
   - 使用场景（生产/测试、不同项目）
   - 数据库设计和 API

4. **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - 实施计划
   - 7个开发阶段
   - 时间估算（16天）
   - 验收标准
   - 风险应对

### UI 设计
5. **[UI-MARKET.md](./UI-MARKET.md)** - 插件市场页面
   - 布局设计
   - 插件卡片
   - 搜索过滤
   - 安装流程

6. **[UI-SERVICES.md](./UI-SERVICES.md)** - 服务配置页面
   - 服务列表
   - 配置表单
   - CRUD 操作
   - 导入导出

7. **[UI-MONITOR.md](./UI-MONITOR.md)** - 监控与日志
   - 连接状态
   - 实时日志
   - 性能图表
   - WebSocket 推送

### 技术设计
8. **[COMPONENTS.md](./COMPONENTS.md)** - 组件库
   - 通用组件
   - 业务组件
   - 布局组件
   - 样式规范

9. **[DATA-FLOW.md](./DATA-FLOW.md)** - 数据流
   - 状态管理
   - React Query
   - WebSocket
   - API 设计

---

## 🎯 快速开始

### 阅读顺序建议

**产品经理/设计师**:
1. OVERVIEW.md（了解整体架构）
2. UI-MARKET.md（插件市场设计）
3. UI-SERVICES.md（服务配置设计）
4. UI-MONITOR.md（监控日志设计）

**前端开发**:
1. OVERVIEW.md（技术栈）
2. COMPONENTS.md（组件库）
3. DATA-FLOW.md（数据流）
4. IMPLEMENTATION.md（开发计划）

**后端开发**:
1. OVERVIEW.md（API 设计）
2. DATA-FLOW.md（接口规范）
3. UI-MONITOR.md（WebSocket 设计）
4. IMPLEMENTATION.md（集成方案）

**项目管理**:
1. OVERVIEW.md（项目概览）
2. IMPLEMENTATION.md（实施计划）

---

## 🚀 核心特性

### 插件市场 🛒
- **官方插件**: 从 Registry Service 获取
  - 经过审核、版本管理
  - 自动更新、下载统计
- **自定义插件**: 本地创建/导入
  - 用户自定义配置
  - 导入/导出分享
- 一键安装
- 搜索/分类/过滤

### 多 Xiaozhi 支持 🌐 新增
- 同时管理多个 Xiaozhi 实例
- 每个实例独立配置工具集
- 适用场景:
  - 生产环境 + 测试环境
  - 不同项目分离
  - 个人 + 团队账号

### 服务管理 ⚙️
- 可视化配置
- 启动/停止/重启
- 健康检查
- 自定义服务

### 实时监控 📊
- 连接状态显示
- 工具调用统计
- 性能指标图表
- 实时日志流

### 配置管理 📝
- 导入/导出配置
- 数据验证
- 配置模板
- 环境变量支持

---
┐
│  Plugin Registry Service (B端)      │
│  后台管理 + 插件发布 API            │
└──────────────┬───────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────┐
│         MCP Agent GUI (C端)             │
├─────────────────────────────────────────┤
│          Web UI (React)                 │
│  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │ Market │  │Services│  │Monitor │   │
│  │官方+自定义│ │        │  │        │   │
│  └────────┘  └────────┘  └────────┘   │
├─────────────────────────────────────────┤
│       State (Zustand + React Query)     │
├─────────────────────────────────────────┤
│       API Server (Express + WS)         │
├─────────────────────────────────────────┤
│       Local Database (SQLite)           │
│  installed_plugins | custom_plugins   │
├─────────────────────────────────────────┤
│       State (Zustand + React Query)     │
├─────────────────────────────────────────┤
│       API Server (Express + WS)         │
├─────────────────────────────────────────┤
│       MCP Agent Core (复用)             │
│  ConfigLoader | ToolAggregator          │
│  XiaozhiConnection | ServiceAdapters    │
└─────────────────────────────────────────┘
```

---

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| **前端框架** | React 18 + TypeScript |
| **构建工具** | Vite |
| **样式方案** | TailwindCSS + shadcn/ui |
| **状态管理** | Zustand (客户端) + React Query (服务端) |
| **路由** | React Router v6 |
| **后端** | Express.js + WebSocket |
| **核心** | 复用现有 MCP4天)
- Registry Service 集成
- 官方插件列表（来自 Registry）
- 自定义插件管理（本地数据库）
- 安装/卸载功能
- 导入/导出

## 📅 开发计划

### Phase 1: 项目搭建 (1天)
- Vite + React + TypeScript
- TailwindCSS 配置
- 基础布局和路由

### Phase 2: API Server (2天)
- Express 服务器
- 集成 MCP Core
- WebSocket 实时推送

### Phase 3: 插件市场 (4天)
- Registry Service 集成
- 官方插件列表（来自 Registry）
- 自定义插件管理（本地数据库）
- 安装/卸载功能
- 导入/导出功能
- 搜索和过滤

### Phase 4: Xiaozhi 多服务支持 (3天) **新增阶段**
- 多连接管理
- 连接配置 UI
- 独立工具集配置
- 连接状态监控

### Phase 5: 服务配置 (2天)
- 服务管理 CRUD
- 配置表单
- 启动/停止控制

### Phase 6: 监控日志 (2天)
- 连接状态监控
- 实时日志查看器
- 性能图表

### Phase 7: 优化测试 (2天)
- 性能优化
- 错误处理
- 测试覆盖

**总计: 18 工作日**
### 插件市场 UI
```
┌────────────────────────────────────┐
│ 🔍 [搜索]  [分类▼] [排序▼] [刷新] │
├────────────────────────────────────┤
│ [官方插件] [我的自定义]            │
├────────────────────────────────────┤
│ 官方插件 (Registry)                │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │🎖️官方│ │🎖️官方│ │🎖️官方│        │
│ │ 🧮   │ │ 🗄️   │ │ 🔍   │        │
│ │ Calc │ │ File │ │Search│        │
│ │v1.2.0│ │v2.1.0│ │v1.0.5│        │
│ │⭐4.8 │ │⭐4.9 │ │⭐4.7 │        │
│ │📥1.2k│ │📥2.5k│ │📥890 │        │
│ │[安装]│ │[安装]│ │[安装]│        │
│ └──────┘ └──────┘ └──────┘        │
│                                    │
│ 我的自定义插件                     │
│ ┌──────┐ ┌──────┐                │
│ │👤自定义│ │👤自定义│    [+ 添加]    │
│ │ 🤖   │ │ 🎨   │                │
│ │Custom│ │My Bot│                │
│ │[编辑]│ │[编辑]│                │
│ └──────┘ └──────┘                │
**总计: 15 工作日**

---

## 🎨 UI 预览（已美化）

在浏览器中打开交互式原型：
```bash
open docs/gui/prototype.html
```

**新增特性**:
- 🎨 现代化渐变色设计
- ✨ 流畅的动画效果
- 🌐 Xiaozhi 多服务管理页面
- 📱 更好的卡片布局和间距
- 🏷️ 美化的徽章和标签
- 🔘 统一的按钮样式系统

### 插件市场 UI
```
┌────────────────────────────────────┐
│ 🔍 [搜索]  [分类▼] [排序▼]        │
├────────────────────────────────────┤
│ [🎖️ 官方插件] [👤 我的自定义]     │
├────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │🎖️官方  │ │🎖️官方  │ │👤自定义│ │
│ │ 🧮 Calc│ │ 🗄️ File│ │ 🤖 AI │ │
│ │⭐4.8   │ │⭐4.9   │ │本地创建│ │
│ │[已安装]│ │ [安装] │ │ [编辑] │ │
│ └────────┘ └────────┘ └────────┘ │
└────────────────────────────────────┘
```

### Xiaozhi 多服务 UI （新增）
```
┌────────────────────────────────────┐
│ 🌐 Xiaozhi 服务         [+ 添加]  │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ 🌐 Xiaozhi 主账号   🟢 已连接 │ │
│ │ 在线: 2h15m  工具: 20  调用: 47│ │
│ │ 使用服务: Calculator, Filesystem│ │
│ │ [断开] [重连] [编辑]           │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ 🌐 Xiaozhi 测试环境 ⚪ 未连接 │ │
│ │ 状态: 手动停止                 │ │
│ │ 使用服务: Calculator, Memory   │ │
│ │ [启动] [编辑]                  │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

### 服务配置
```
┌────────────────────────────────────┐
│ [+ 添加服务]        [导入] [导出] │
├────────────────────────────────────┤
│ 🟢 运行中 (2)  🔴 已停止 (1)      │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ 🧮 Calculator      🟢 运行中   │ │
│ │ Type: SSE                      │ │
│ │ Tools: 6                       │ │
│ │ [停止] [编辑] [删除] [日志]   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
# Registry 插件
GET    /api/registry/plugins           # 官方插件列表
GET    /api/registry/plugins/:id       # 插件详情
POST   /api/plugins/install/:id        # 安装官方插件
GET    /api/registry/sync              # 同步数据

# 自定义插件
GET    /api/custom-plugins             # 自定义插件列表
POST   /api/custom-plugins             # 添加自定义
POST   /api/custom-plugins/import      # 导入插件
GET    /api/custom-plugins/:id/export  # 导出插件

# 已安装插件
GET    /api/installed-plugins          # 已安装列表
DELETE /api/installed-plugins/:id      # 卸载插件

# 服务管理
GET    /api/services                   # 服务列表
POST   /api/services/:id/toggle        # 启动/停止

# 系统监控
GET    /api/status                     # 系统状态
GET    /api/logs          
### 服务配置
```
┌────────────────────────────────────┐
│ [+ 添加服务]        [导入] [导出] │
├────────────────────────────────────┤
│ 🟢 运行中 (2)  🔴 已停止 (1)      │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ 🧮 Calculator      🟢 运行中   │ │
│ │ Type: SSE                      │ │
│ │ Tools: 6                       │ │
│ │ [停止] [编辑] [删除] [日志]   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

---

## 📝 API 规范

### RESTful API
```
# Registry 插件
GET    /api/registry/plugins           # 官方插件列表
POST   /api/plugins/install/:id        # 安装官方插件

# 自定义插件
GET    /api/custom-plugins             # 自定义插件列表
POST   /api/custom-plugins             # 添加自定义
POST   /api/custom-plugins/import      # 导入插件

# Xiaozhi 连接 (新增)
GET    /api/xiaozhi/connections        # 连接列表
POST   /api/xiaozhi/connections        # 添加连接
POST   /api/xiaozhi/connections/:id/connect    # 连接
POST   /api/xiaozhi/connections/:id/disconnect # 断开

# 服务管理
GET    /api/services                   # 服务列表
POST   /api/services/:id/toggle        # 启动/停止

# 系统监控
GET    /api/status                     # 系统状态
GET    /api/logs                       # 日志查询
```

### WebSocket Events
```
connection:status    # 连接状态变化
service:status       # 服务状态变化
tool:called          # 工具调用事件
log:new              # 新日志产生
```官方插件：从 Registry 同步
- ✅ 自定义插件：添加、导入、导出
- ✅ 多 Xiaozhi 支持：管理多个实例 **新增**
- ✅ 服务配置：添加、编辑、删除、启停
- ✅ 实时监控：连接状态、统计信息
- ✅ 日志查看：实时显示、搜索、过滤
## ✅ 验收标准

### 功能完整性
- ✅ 插件市场：浏览、搜索、安装、卸载
- ✅ 服务配置：添加、编辑、删除、启停
- ✅ 实时监控：连接状态、统计信息
- ✅ 日志查看：实时显示、搜索、过滤
- ✅ 自定义插件：添加、导入、导出

### 性能指标
- ✅ 首屏加载 <2秒
- ✅ 操作响应 <500ms
- ✅ 日志滚动流畅（60fps）
- ✅ WebSocket 延迟 <100ms

### 代码质量
- ✅ TypeScript 无错误
- ✅ ESLint 0 错误
- ✅ 测试覆盖率 >70%
- ✅ 无内存泄漏

---

## 🔗 相关资源

- [MCP Agent 核心文档](../IMPLEMENTATION_PLAN.md)
- [MCP 协议规范](https://github.com/modelcontextprotocol/specification)
- [React Query 文档](https://tanstack.com/query/latest)
- [shadcn/ui 组件](https://ui.shadcn.com/)

---

## 📧 联系方式

有问题或建议？欢迎反馈！
