# 下一步行动指南

## 🎯 立即开始

### 选项 1: 按阶段实施（推荐）
```bash
# 1. 创建项目结构
cd /Users/kangkang/Workspace/ESP/mcp-agent
mkdir -p gui/packages/{web,server}

# 2. 初始化 Web 项目
cd gui/packages/web
npm create vite@latest . -- --template react-ts
npm install

# 3. 安装依赖
npm install \
  react-router-dom \
  zustand \
  @tanstack/react-query \
  tailwindcss postcss autoprefixer \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-select \
  @radix-ui/react-switch \
  lucide-react \
  clsx tailwind-merge

# 4. 初始化 Tailwind
npx tailwindcss init -p
```

### 选项 2: 验证设计（先看效果）
```bash
# 可以先创建静态 HTML 原型验证设计
# 或使用 Figma/Sketch 制作交互原型
```

---

## 📋 当前状态

### ✅ 已完成
- MCP Agent Core (完整实现)
- 64 单元测试通过
- 4 种服务适配器（SSE/Stdio/HTTP/Embedded）
- 连接管理和心跳
- 参数映射
- 环境变量配置

### 🎨 新增（本次设计）
- GUI 架构设计
- 7 个设计文档
- 实施计划（15天）
- 组件库规范
- API 接口设计
- 数据流设计

---

## 🚀 启动 Phase 1

### Day 1: 项目搭建

#### 上午 (4h)
1. **创建项目结构** (1h)
   ```bash
   mkdir -p gui/packages/{web,server}
   cd gui/packages/web
   npm create vite@latest . -- --template react-ts
   ```

2. **安装核心依赖** (1h)
   - React Router
   - TailwindCSS
   - shadcn/ui
   - Zustand
   - React Query

3. **配置工具链** (1h)
   - tailwind.config.js
   - tsconfig.json
   - vite.config.ts
   - ESLint + Prettier

4. **基础布局** (1h)
   - Layout 组件
   - Sidebar 导航
   - Header 顶栏

#### 下午 (4h)
1. **路由配置** (1h)
   ```tsx
   // src/App.tsx
   <Routes>
     <Route path="/" element={<Dashboard />} />
     <Route path="/market" element={<Market />} />
     <Route path="/services" element={<Services />} />
     <Route path="/monitor" element={<Monitor />} />
     <Route path="/logs" element={<Logs />} />
   </Routes>
   ```

2. **创建页面骨架** (2h)
   - Dashboard.tsx
   - Market.tsx
   - Services.tsx
   - Monitor.tsx
   - Logs.tsx

3. **样式系统** (1h)
   - 配置 Tailwind
   - 颜色主题
   - 间距系统

#### 验收
- ✅ `npm run dev` 启动成功
- ✅ 所有路由可访问
- ✅ 布局正常显示
- ✅ 无 TypeScript 错误

---

## 📁 目录结构预览

```
mcp-agent/
├── gui/
│   ├── packages/
│   │   ├── web/                    # Web 前端
│   │   │   ├── src/
│   │   │   │   ├── components/     # 组件
│   │   │   │   │   ├── ui/         # 通用组件
│   │   │   │   │   ├── business/   # 业务组件
│   │   │   │   │   └── layout/     # 布局组件
│   │   │   │   ├── pages/          # 页面
│   │   │   │   │   ├── Dashboard.tsx
│   │   │   │   │   ├── Market.tsx
│   │   │   │   │   ├── Services.tsx
│   │   │   │   │   ├── Monitor.tsx
│   │   │   │   │   └── Logs.tsx
│   │   │   │   ├── stores/         # 状态管理
│   │   │   │   │   ├── pluginStore.ts
│   │   │   │   │   ├── serviceStore.ts
│   │   │   │   │   ├── logStore.ts
│   │   │   │   │   └── uiStore.ts
│   │   │   │   ├── hooks/          # 自定义 Hooks
│   │   │   │   ├── api/            # API 客户端
│   │   │   │   ├── utils/          # 工具函数
│   │   │   │   ├── App.tsx
│   │   │   │   └── main.tsx
│   │   │   ├── public/
│   │   │   ├── package.json
│   │   │   ├── tailwind.config.js
│   │   │   ├── vite.config.ts
│   │   │   └── tsconfig.json
│   │   │
│   │   └── server/                 # API 服务器
│   │       ├── src/
│   │       │   ├── routes/
│   │       │   │   ├── plugins.ts
│   │       │   │   ├── services.ts
│   │       │   │   └── logs.ts
│   │       │   ├── controllers/
│   │       │   ├── middlewares/
│   │       │   ├── websocket.ts
│   │       │   └── index.ts
│   │       ├── package.json
│   │       └── tsconfig.json
│   │
│   └── README.md
│
├── src/                            # 现有的 MCP Core
├── config/
├── docs/
│   └── gui/                        # GUI 设计文档
│       ├── README.md
│       ├── OVERVIEW.md
│       ├── UI-MARKET.md
│       ├── UI-SERVICES.md
│       ├── UI-MONITOR.md
│       ├── COMPONENTS.md
│       ├── DATA-FLOW.md
│       └── IMPLEMENTATION.md
└── package.json
```

---

## 🔧 Vite 配置示例

```typescript
// gui/packages/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
```

---

## 🎨 TailwindCSS 配置

```javascript
// gui/packages/web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4',
      },
    },
  },
  plugins: [],
}
```

---

## 💡 关键决策点

### 1. 打包策略
- **选项 A**: 独立部署（Web + API Server 分离）
- **选项 B**: 打包成单个应用（推荐）
  ```
  mcp-agent/
  ├── dist/
  │   ├── gui/        # Web 静态文件
  │   └── server/     # API Server
  ```

### 2. 数据持久化
- **选项 A**: 继续使用 `agent-config.json`
- **选项 B**: 引入 SQLite（支持更复杂查询）

### 3. 身份验证
- **Phase 1**: 无需认证（本地使用）
- **Phase 2**: 添加简单密码保护
- **Phase 3**: OAuth 集成

---

## 🐛 预期问题

### 1. CORS 问题
**解决**: 配置 Vite proxy 或 Express CORS

### 2. WebSocket 连接
**解决**: 确保 server 和 client 端口匹配

### 3. 配置文件锁定
**解决**: 实现文件锁或使用数据库

### 4. 实时更新性能
**解决**: 虚拟滚动 + 日志分页

---

## 📊 成功指标

### Phase 1 完成标准
- ✅ 项目启动无错误
- ✅ 5 个页面路由正常
- ✅ 基础布局显示正确
- ✅ 开发服务器可访问

### 最终验收标准
- ✅ 所有功能模块完整
- ✅ 界面美观易用
- ✅ 性能指标达标
- ✅ 无严重 Bug
- ✅ 文档完整

---

## 🎓 学习资源

- [React 官方文档](https://react.dev/)
- [Vite 官方文档](https://vitejs.dev/)
- [TailwindCSS 文档](https://tailwindcss.com/)
- [React Query 文档](https://tanstack.com/query/latest)
- [Zustand 文档](https://docs.pmnd.rs/zustand)
- [shadcn/ui 组件](https://ui.shadcn.com/)

---

## 📞 获取帮助

遇到问题？
1. 查看对应的设计文档
2. 检查验收标准
3. 参考示例代码
4. 提出具体问题

准备好开始了吗？ 🚀
