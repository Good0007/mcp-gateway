# Monorepo 重构设计

## 1. 当前问题

| 问题 | 原因 |
|------|------|
| Server 通过 `createRequire` hack 加载根项目 `dist/` | 跨模块系统 (CJS↔ESM) 无 workspace 依赖 |
| Shared 包手动复制核心类型 | 无法直接引用核心包导出 |
| CLI 嵌入在核心 `src/` 内 | 无法独立发布和依赖管理 |
| `gui/packages/` 嵌套层级深 | 非标准 monorepo 结构 |
| 根项目是 CommonJS，GUI 是 ESM | 模块系统不统一 |

## 2. 目标结构

```
mcp-agent/
├── packages/
│   ├── core/              ← 核心引擎 (原 src/)
│   │   ├── src/
│   │   │   ├── core/      ← MCPAgent, ServiceRegistry, ToolAggregator
│   │   │   ├── adapters/  ← Stdio/SSE/HTTP/Embedded
│   │   │   ├── types/     ← 类型 + Zod schemas
│   │   │   ├── config/    ← ConfigLoader
│   │   │   ├── utils/     ← logger, result-validator
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/            ← 前端安全类型 + 公共工具
│   │   ├── src/
│   │   │   └── types/     ← 从 core re-export (无 Zod)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/            ← API Server (原 gui/packages/server)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── agent.ts   ← 直接 import @mcp-agent/core
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/               ← React 前端 (原 gui/packages/web)
│   │   ├── src/
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/               ← CLI 工具 (原 src/cli.ts)
│   │   ├── src/
│   │   │   └── cli.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── desktop/           ← Electron 桌面端 (预留)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── config/                ← 运行时配置 (不变)
├── examples/              ← 示例 (不变)
├── scripts/               ← 脚本 (不变)
├── tests/                 ← E2E/集成测试 (单元测试移入各包)
├── docs/                  ← 文档 (不变)
├── package.json           ← workspace 根配置
├── tsconfig.json          ← TypeScript 基础配置
└── bunfig.toml            ← Bun 配置
```

## 3. 包依赖关系

```
  ┌──────────┐
  │   core   │  ← 零内部依赖，纯核心引擎
  └────┬─────┘
       │
  ┌────▼─────┐
  │  shared  │  ← 依赖 core (re-export 前端安全类型)
  └──┬───┬───┘
     │   │
┌────▼┐ ┌▼──────┐
│ web │ │server │  ← 都依赖 shared
└─────┘ └───┬───┘
            │
       ┌────▼───┐
       │  cli   │  ← 依赖 core
       └────────┘
       ┌────────┐
       │desktop │  ← 依赖 web + server (Electron 打包)
       └────────┘
```

**详细依赖**:

| 包 | 名称 | 依赖 |
|---|---|---|
| core | `@mcp-agent/core` | 外部: @modelcontextprotocol/sdk, ws, zod, winston, chokidar, axios, execa, dotenv |
| shared | `@mcp-agent/shared` | `@mcp-agent/core` (types only) |
| server | `@mcp-agent/server` | `@mcp-agent/core`, `@mcp-agent/shared`, hono, @hono/node-server |
| web | `@mcp-agent/web` | `@mcp-agent/shared`, react, vite, tailwindcss, radix-ui |
| cli | `@mcp-agent/cli` | `@mcp-agent/core` |
| desktop | `@mcp-agent/desktop` | `@mcp-agent/web`, `@mcp-agent/server`, electron |

## 4. 模块系统决策

**方案: 统一 ESM** (推荐)

| 维度 | 选择 |
|------|------|
| 模块系统 | ESM (`"type": "module"`) |
| TypeScript module | `"module": "Node16"` / `"moduleResolution": "Node16"` |
| Target | `ES2022` |
| 构建工具 | core/shared/server/cli 使用 `tsc`，web 使用 `vite` |

> Core 从 CommonJS 迁移到 ESM。当前依赖 (`@modelcontextprotocol/sdk`, `ws`, `zod` 等) 均支持 ESM。

## 5. Workspace 配置

**根 `package.json`**:
```json
{
  "name": "mcp-agent-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --filter '*' build",
    "dev": "bun run --filter '*' dev",
    "dev:web": "bun run --filter @mcp-agent/web dev",
    "dev:server": "bun run --filter @mcp-agent/server dev",
    "clean": "bun run --filter '*' clean",
    "typecheck": "bun run --filter '*' typecheck"
  },
  "devDependencies": {
    "typescript": "~5.7.3"
  }
}
```

**根 `tsconfig.json`** (基础配置):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

各子包 `tsconfig.json` 通过 `extends` 继承:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../core" }
  ]
}
```

## 6. 关键变化

### 6.1 消除 createRequire hack

**Before** (server/src/agent.ts):
```typescript
const require = createRequire(import.meta.url);
const { MCPAgent } = require('../../../../dist/core/mcp-agent.js');
```

**After**:
```typescript
import { MCPAgent } from '@mcp-agent/core';
```

### 6.2 Shared 类型改为 re-export

**Before**: 手动复制核心类型到 shared

**After** (shared/src/types/index.ts):
```typescript
// 从 core 直接 re-export 前端安全类型
export type {
  ServiceConfig,
  ServiceType,
  AgentConfig,
} from '@mcp-agent/core';

// shared 独有的 API 层类型
export * from './api.js';
```

### 6.3 CLI 独立包

**Before**: `src/cli.ts` 内嵌在核心包

**After**: `packages/cli/src/cli.ts`
```typescript
import { MCPAgent } from '@mcp-agent/core';
// CLI 逻辑不变，只是 import 路径变化
```

## 7. 开发体验

```bash
# 安装所有依赖
bun install

# 开发 (全部)
bun run dev

# 开发 (仅前端 + API)
bun run dev:web & bun run dev:server

# 构建全部
bun run build

# 单独构建某个包
bun run --filter @mcp-agent/core build

# 运行 CLI
bun run --filter @mcp-agent/cli start
```
