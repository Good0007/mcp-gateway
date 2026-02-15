# Monorepo 迁移步骤

> 按顺序执行，每步可独立验证。

## Phase 1: 初始化 Workspace (预计 10 分钟)

### 1.1 创建目录

```bash
mkdir -p packages/{core,shared,server,web,cli,desktop}/src
```

### 1.2 根 package.json

备份原 `package.json` → 替换为 workspace 根配置:

```bash
cp package.json package.json.bak
```

```json
{
  "name": "mcp-agent-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --filter '*' build",
    "build:core": "bun run --filter @mcp-agent/core build",
    "dev": "bun run --filter '*' dev",
    "dev:web": "bun run --filter @mcp-agent/web dev",
    "dev:server": "bun run --filter @mcp-agent/server dev",
    "dev:cli": "bun run --filter @mcp-agent/cli dev",
    "clean": "bun run --filter '*' clean",
    "typecheck": "bun run --filter '*' typecheck"
  },
  "devDependencies": {
    "typescript": "~5.7.3"
  }
}
```

### 1.3 根 tsconfig.json

替换为基础配置（各包继承）:

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
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  }
}
```

---

## Phase 2: 迁移 Core 包 (预计 20 分钟)

### 2.1 移动文件

```bash
# 移动源码 (保留目录结构)
cp -r src/core packages/core/src/
cp -r src/adapters packages/core/src/
cp -r src/types packages/core/src/
cp -r src/config packages/core/src/
cp -r src/utils packages/core/src/
cp src/index.ts packages/core/src/
```

### 2.2 packages/core/package.json

```json
{
  "name": "@mcp-agent/core",
  "version": "0.1.0",
  "description": "MCP Agent 核心引擎",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ws": "^8.18.0",
    "dotenv": "^16.4.5",
    "zod": "^3.23.8",
    "winston": "^3.14.2",
    "execa": "^8.0.1",
    "chokidar": "^3.6.0",
    "axios": "^1.7.7"
  },
  "devDependencies": {
    "@types/node": "^20.14.15",
    "@types/ws": "^8.5.12"
  }
}
```

### 2.3 packages/core/tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 2.4 CJS → ESM 修改

Core 源码中的 import 路径需加 `.js` 后缀:

```bash
# 示例：所有 from './xxx' 需改为 from './xxx.js'
# 可用脚本批量处理或手动修改
```

**需要注意的 CJS 特有写法**:
- `__dirname` → `import.meta.dirname` 或 `path.dirname(fileURLToPath(import.meta.url))`
- `require()` → `import`/`import()`
- `module.exports` → `export`

### 2.5 验证

```bash
cd packages/core && bun run build
# 确认 dist/ 产物正常
```

---

## Phase 3: 迁移 CLI 包 (预计 10 分钟)

### 3.1 移动文件

```bash
cp src/cli.ts packages/cli/src/
```

### 3.2 packages/cli/package.json

```json
{
  "name": "@mcp-agent/cli",
  "version": "0.1.0",
  "description": "MCP Agent CLI",
  "type": "module",
  "bin": {
    "mcp-agent": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/cli.ts",
    "start": "node dist/cli.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@mcp-agent/core": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.17.0"
  }
}
```

### 3.3 修改 import

```typescript
// Before
import { MCPAgent } from './core/mcp-agent.js';

// After
import { MCPAgent } from '@mcp-agent/core';
```

### 3.4 packages/cli/tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../core" }]
}
```

---

## Phase 4: 迁移 Shared 包 (预计 10 分钟)

### 4.1 移动文件

```bash
cp -r gui/packages/shared/src/* packages/shared/src/
```

### 4.2 修改为 re-export

`packages/shared/src/types/config.ts` — 改为从 core re-export:

```typescript
// 直接 re-export core 中前端安全的类型 (不含 Zod runtime)
export type {
  ServiceType,
  ServiceConfig,
  StdioServiceConfig,
  SSEServiceConfig,
  AgentConfig,
} from '@mcp-agent/core';
```

`packages/shared/src/types/api.ts` — 保持不变 (API 层独有类型)

### 4.3 packages/shared/package.json

```json
{
  "name": "@mcp-agent/shared",
  "version": "1.0.0",
  "description": "Shared types for MCP Agent",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@mcp-agent/core": "workspace:*"
  }
}
```

---

## Phase 5: 迁移 Server 包 (预计 10 分钟)

### 5.1 移动文件

```bash
cp -r gui/packages/server/src/* packages/server/src/
```

### 5.2 消除 createRequire hack

`packages/server/src/agent.ts`:

```typescript
// Before
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { MCPAgent } = require('../../../../dist/core/mcp-agent.js');

// After
import { MCPAgent } from '@mcp-agent/core';
```

### 5.3 packages/server/package.json

```json
{
  "name": "@mcp-agent/server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@mcp-agent/core": "workspace:*",
    "@mcp-agent/shared": "workspace:*",
    "hono": "^4.6.14",
    "@hono/node-server": "^1.14.8",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "tsx": "^4.19.2"
  }
}
```

> 注意: 依赖从 `file:../shared` 改为 `workspace:*`

---

## Phase 6: 迁移 Web 包 (预计 10 分钟)

### 6.1 移动文件

```bash
cp -r gui/packages/web/* packages/web/
# 排除 node_modules
rm -rf packages/web/node_modules
```

### 6.2 更新 package.json

```diff
  "name": "@mcp-agent/web",
+ "dependencies": {
+   "@mcp-agent/shared": "workspace:*",
    ...
  }
```

### 6.3 更新 vite.config.ts (如有路径别名)

确认 `@/` 别名指向 `packages/web/src`

---

## Phase 7: 清理 & 安装 (预计 10 分钟)

### 7.1 删除旧结构

```bash
# 确认新结构正常后再删除!
rm -rf src/          # 已迁移到 packages/core + packages/cli
rm -rf gui/          # 已迁移到 packages/{web,server,shared}
rm -rf dist/         # 旧产物
rm -rf node_modules/ # 重新安装
rm package.json.bak
```

### 7.2 安装依赖

```bash
bun install
```

### 7.3 构建验证

```bash
# 按依赖顺序构建
bun run --filter @mcp-agent/core build
bun run --filter @mcp-agent/shared build
bun run --filter @mcp-agent/server build
bun run --filter @mcp-agent/cli build
bun run --filter @mcp-agent/web build
```

### 7.4 运行验证

```bash
# CLI
bun run --filter @mcp-agent/cli start

# API Server
bun run --filter @mcp-agent/server dev

# Web
bun run --filter @mcp-agent/web dev
```

---

## Phase 8: Desktop 预留 (可后续执行)

### packages/desktop/package.json

```json
{
  "name": "@mcp-agent/desktop",
  "version": "0.1.0",
  "private": true,
  "description": "MCP Agent Desktop (Electron)",
  "type": "module",
  "scripts": {
    "dev": "echo 'TODO: electron dev'",
    "build": "echo 'TODO: electron build'"
  },
  "dependencies": {
    "@mcp-agent/web": "workspace:*",
    "@mcp-agent/server": "workspace:*"
  }
}
```

---

## 迁移检查清单

- [ ] `bun install` 无报错
- [ ] `bun run build` 全部包编译通过
- [ ] CLI 能正常启动 Agent
- [ ] API Server 端口 30001 正常响应
- [ ] Web dev server 端口 5173 正常加载
- [ ] 主题切换功能正常
- [ ] API 端点 `/api/status`, `/api/plugins` 正常返回
- [ ] 旧 `gui/` 和 `src/` 目录已清理
- [ ] Git 历史干净 (`git mv` 或确认 diff 合理)

---

## 风险 & 注意事项

| 风险 | 应对 |
|------|------|
| CJS→ESM 迁移可能有遗漏 | 关注 `__dirname`, `require()`, 缺少 `.js` 后缀 |
| 配置文件路径变化 | `config/` 保持根目录不变，CLI 用相对路径找 |
| 测试文件迁移 | 单元测试移入各包 `__tests__/`，集成测试留根目录 |
| `.env` 文件位置 | 保持根目录，各包通过 `dotenv` 读取 |
| Git 历史 | 建议用 `git mv` 保留文件历史 |
