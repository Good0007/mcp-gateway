# 开发者指南

> 面向想要贡献代码或深度定制的开发者

## � 常见问题诊断

### ECONNREFUSED 错误

如果看到 `[vite] http proxy error` 或 `AggregateError [ECONNREFUSED]` 错误：

**原因**：前端无法连接到后端服务器（端口 3001）

**解决方案**：

```bash
# 方案 1：分别启动（推荐）
# 终端 1
cd packages/server
npm run dev    # 或 bun run dev

# 终端 2  
cd packages/web
npm run dev    # 或 bun run dev

# 方案 2：检查端口占用
lsof -ti :3001 | xargs kill -9  # macOS/Linux
```

### 安装服务死循环

**已修复**：立即清除选中状态，添加缓存时间

如果仍遇到问题：
1. 清除浏览器缓存
2. 重启开发服务器
3. 检查 Network 标签查看请求循环

### 验证服务正常运行

```bash
# 检查后端健康状态
curl http://localhost:3001/health

# 访问前端
open http://localhost:5174
```

---

## �🛠️ 开发环境设置

### 前置要求

- **Bun** 1.3+ - [安装指南](https://bun.sh/docs/installation)
- **Node.js** 18+ (可选，用于测试生产构建)
- **Git** 2.0+

### 克隆和安装

```bash
# 1. 克隆仓库
git clone https://github.com/your-repo/mcp-agent.git
cd mcp-agent

# 2. 安装依赖（所有包）
bun install

# 3. 启动开发环境
bun run dev
```

## 📁 项目结构详解

```
mcp-agent/
├── packages/
│   ├── shared/              # 共享类型和常量
│   │   └── src/
│   │       └── types/       # TypeScript 类型定义
│   │
│   ├── core/                # MCP 核心业务逻辑
│   │   └── src/
│   │       ├── adapters/    # 服务适配器（stdio/sse/http/embedded）
│   │       ├── core/        # 核心类（MCPAgent, ServiceRegistry）
│   │       ├── config/      # 配置加载和管理
│   │       └── utils/       # 工具函数
│   │
│   ├── server/              # API 服务器（Hono）
│   │   └── src/
│   │       ├── routes/      # API 路由（services/config/auth 等）
│   │       ├── middleware/  # 中间件（认证、CORS 等）
│   │       ├── env.ts       # 环境变量配置
│   │       └── index.ts     # 服务器入口
│   │
│   ├── web/                 # Web 前端（React + Vite）
│   │   └── src/
│   │       ├── pages/       # 页面组件
│   │       ├── components/  # 可复用 UI 组件
│   │       ├── api/         # API 客户端封装
│   │       ├── hooks/       # React Hooks
│   │       └── store/       # 状态管理
│   │
│   └── cli/                 # 命令行工具（TODO）
│
├── config/                  # 配置文件目录
│   ├── web-config.json      # 服务配置
│   └── runtime-state.json   # 运行时状态
│
├── docs/                    # 文档
├── tests/                   # 测试文件
│   ├── unit/                # 单元测试
│   └── integration/         # 集成测试
│
├── scripts/                 # 工具脚本
└── examples/                # 示例配置和服务
```

## 🔧 开发命令

### 开发模式

```bash
# 启动完整开发环境（API + Web）
bun run dev

# 只启动 API Server
bun run dev:server

# 只启动 Web 前端
bun run dev:web
```

### 构建

```bash
# 构建所有包
bun run build

# 完整构建（包含前端静态文件）
bun run build:full

# 单独构建某个包
cd packages/core && bun run build
```

### 测试

```bash
# 运行所有测试
bun test

# 运行单个测试文件
bun test tests/unit/adapters/stdio-adapter.test.ts

# 集成测试
bun test:integration

# 测试覆盖率
bun test --coverage
```

### 代码检查

```bash
# ESLint 检查
bun run lint

# 自动修复
bun run lint:fix

# TypeScript 类型检查
bun run typecheck
```

## 🏗️ 添加新功能

### 1. 添加新的适配器类型

创建 `packages/core/src/adapters/my-adapter.ts`：

```typescript
import { BaseAdapter } from './base-adapter';

export class MyAdapter extends BaseAdapter {
  async initialize() {
    // 初始化逻辑
  }

  async start() {
    // 启动服务
  }

  async stop() {
    // 停止服务
  }

  async listTools() {
    // 返回工具列表
    return [];
  }

  async callTool(name: string, args: any) {
    // 调用工具
    return { content: [] };
  }
}
```

注册到 `packages/core/src/adapters/index.ts`：

```typescript
export function createAdapter(config: ServiceConfig) {
  switch (config.type) {
    case 'my-type':
      return new MyAdapter(config);
    // ... 其他类型
  }
}
```

### 2. 添加新的 API 路由

创建 `packages/server/src/routes/my-route.ts`：

```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/my-endpoint', async (c) => {
  return c.json({ message: 'Hello' });
});

export default app;
```

挂载到 `packages/server/src/index.ts`：

```typescript
import myRoute from './routes/my-route';

app.route('/api/my', myRoute);
```

### 3. 添加新的前端页面

创建 `packages/web/src/pages/MyPage.tsx`：

```typescript
export function MyPage() {
  return (
    <div>
      <h1>My New Page</h1>
    </div>
  );
}
```

添加到 `App.tsx` 路由：

```typescript
import { MyPage } from '@/pages/MyPage';

// 在 App 组件中
const renderPage = () => {
  switch (currentPage) {
    case 'my-page':
      return <MyPage />;
    // ... 其他页面
  }
};
```

## 🧪 测试指南

### 单元测试示例

```typescript
// tests/unit/core/service-registry.test.ts
import { describe, test, expect } from 'bun:test';
import { ServiceRegistry } from '@/core/service-registry';

describe('ServiceRegistry', () => {
  test('should register service', () => {
    const registry = new ServiceRegistry();
    registry.register('test-service', mockService);
    
    expect(registry.has('test-service')).toBe(true);
  });
});
```

### 集成测试示例

```typescript
// tests/integration/api.test.ts
import { describe, test, expect } from 'bun:test';

describe('API Integration', () => {
  test('GET /api/services should return services', async () => {
    const response = await fetch('http://localhost:3001/api/services');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

## 🐳 Docker 开发

### 本地构建镜像

```bash
# 构建镜像
docker build -t mcp-agent:dev .

# 运行容器
docker run -d -p 3000:3000 mcp-agent:dev

# 查看日志
docker logs -f <container_id>
```

### 使用 Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 重新构建
docker-compose build --no-cache

# 停止服务
docker-compose down
```

### 多平台构建

```bash
# 设置 buildx
make buildx-setup

# 构建多平台镜像（AMD64 + ARM64）
make buildx-build

# 推送到 Docker Hub
make buildx-push
```

## 📝 代码规范

### TypeScript 规范

- 使用严格模式 (`"strict": true`)
- 优先使用 `interface` 而非 `type`
- 导出的函数和类必须有 JSDoc 注释

### 命名约定

- **文件名**: kebab-case (`my-component.tsx`)
- **组件名**: PascalCase (`MyComponent`)
- **函数名**: camelCase (`handleClick`)
- **常量**: UPPER_SNAKE_CASE (`API_BASE_URL`)

### 提交规范

使用 Conventional Commits：

```bash
feat: 添加新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式（不影响逻辑）
refactor: 重构
test: 测试相关
chore: 构建或工具相关
```

示例：

```bash
git commit -m "feat: 添加 GitHub 适配器"
git commit -m "fix: 修复 stdio 适配器内存泄漏"
```

## 🔍 调试技巧

### 后端调试

在 `packages/server/src/index.ts` 中：

```typescript
// 启用详细日志
console.log('[DEBUG] Request:', c.req.url);
console.log('[DEBUG] Body:', await c.req.json());
```

### 前端调试

在浏览器中：

```typescript
// React DevTools
// Redux DevTools (如果使用)

// 手动触发 API 请求
fetch('/api/services')
  .then(r => r.json())
  .then(console.log);
```

### 网络调试

```bash
# 查看服务器端口占用
lsof -i :3000

# 测试 API
curl -X GET http://localhost:3001/api/services

# 测试认证
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

## 🚀 发布流程

### 1. 更新版本号

```bash
# 更新 package.json 版本
bun version patch  # 0.0.1 → 0.0.2
bun version minor  # 0.0.2 → 0.1.0
bun version major  # 0.1.0 → 1.0.0
```

### 2. 构建生产镜像

```bash
# 构建并标记版本
docker build -t kangkang223/mcp-agent:1.0.0 .
docker tag kangkang223/mcp-agent:1.0.0 kangkang223/mcp-agent:latest

# 推送到 Docker Hub
docker push kangkang223/mcp-agent:1.0.0
docker push kangkang223/mcp-agent:latest
```

### 3. 创建 Git Tag

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 📚 相关资源

- [MCP 协议文档](https://modelcontextprotocol.io/)
- [Bun 文档](https://bun.sh/docs)
- [Hono 文档](https://hono.dev/)
- [React Query 文档](https://tanstack.com/query/)
- [TailwindCSS 文档](https://tailwindcss.com/)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### PR 检查清单

- [ ] 代码通过 `bun run lint`
- [ ] 所有测试通过 `bun test`
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交信息符合规范

---

**感谢你的贡献！** 🎉
