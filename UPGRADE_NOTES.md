# 升级说明

> **注意**: 此文档已归档。请参考 [README.md](README.md) 和 [QUICKSTART.md](QUICKSTART.md) 获取最新的使用说明。

## 主要特性

- ✅ 统一启动：`bun run dev` 启动完整环境
- ✅ Web 管理界面：http://localhost:5174
- ✅ API Server：http://localhost:3001
- ✅ 环境检测和管理
- ✅ MCP 配置导入
- ✅ 实时日志查看

更多信息请查阅 [README.md](README.md)。
          └────────┬───────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐         ┌─────▼──────┐
   │  Tools  │         │  Xiaozhi   │
   │  (23个) │         │  WebSocket │
   └─────────┘         └────────────┘
```

## 文件修改清单

### Packages/Web

**vite.config.ts**:
- ✅ 添加 proxy 配置
- ✅ 设置端口 5174
- ✅ 配置 preview 端口

**src/lib/api.ts**:
- ✅ 移除 `API_BASE_URL` 环境变量依赖
- ✅ 使用相对路径（通过 proxy 转发）
- ✅ 简化 ApiClient 构造函数

### Packages/Server

**src/app.ts**:
- ✅ 添加 `serveStatic` 中间件
- ✅ 生产模式下提供静态文件服务
- ✅ SPA 路由支持 (fallback to index.html)

**package.json**:
- ✅ 添加 `dev:full` 脚本（使用 concurrently）
- ✅ 添加 `dev:web` 脚本
- ✅ 添加 `build:full` 脚本
- ✅ 添加 `copy:web` 脚本
- ✅ 安装 `concurrently@9.2.1`

### 根目录

**package.json**:
- ✅ 修改 `dev` 为统一启动入口
- ✅ 添加 `build:full` 完整构建流程
- ✅ 添加 `start` 生产启动命令

**README.md**:
- ✅ 更新快速开始说明
- ✅ 说明新的启动方式
- ✅ 添加架构说明链接

## 测试验证

### ✅ Server 健康检查
```bash
$ curl http://localhost:3001/health
{
  "status": "ok",
  "timestamp": "2026-02-15T11:01:43.212Z"
}
```

### ✅ Web 前端访问
```bash
$ curl -s http://localhost:5174/ | grep -o '<title>.*</title>'
<title>web</title>
```

### ✅ Proxy 转发测试
```bash
$ curl http://localhost:5174/api/status
{
  "running": false,
  "services": {...}
}

$ curl http://localhost:5174/api/services | jq '.services | length'
6
```

### ✅ Agent 状态
```bash
$ curl http://localhost:3001/api/status | jq
{
  "running": true,
  "connected": true,
  "services": {
    "total": 6,
    "running": 2,
    "stopped": 4,
    "error": 0
  }
}
```

### ✅ 工具列表
```bash
$ curl http://localhost:3001/api/tools | jq '.tools | length'
23
```

## 使用指南

### 开发调试

1. **启动开发环境**:
```bash
bun run dev
```

2. **访问 Web 界面**:
```
http://localhost:5174
```

3. **查看 API 文档**:
- Status: `GET /api/status`
- Services: `GET /api/services`
- Tools: `GET /api/tools`
- Health: `GET /health`

4. **查看日志**:
```bash
tail -f logs/mcp-agent.log
```

### 生产部署

1. **构建所有包**:
```bash
bun run build:full
```

这会：
- 构建 `@mcp-agent/shared` (类型)
- 构建 `@mcp-agent/core` (Agent 核心)
- 构建 `@mcp-agent/server` (API Server)
- 构建 `@mcp-agent/web` (React 前端)
- 复制 Web 静态文件到 `packages/server/public/`

2. **启动生产服务器**:
```bash
bun run start
```

或直接：
```bash
cd packages/server
NODE_ENV=production node dist/index.js
```

3. **访问应用**:
```
http://localhost:3001
```

一个端口同时提供 API 和 Web 界面！

### 配置服务

编辑 `config/agent-config.json`:

```json
{
  "xiaozhi": {
    "endpoint": "wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN",
    "reconnectInterval": 5000,
    "maxReconnectAttempts": 10
  },
  "services": [
    {
      "id": "filesystem-npx",
      "type": "stdio",
      "name": "Filesystem Service",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/you"]
    },
    {
      "id": "memory-npx",
      "type": "stdio",
      "name": "Memory Service",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  ]
}
```

保存后，Agent 会自动重新加载配置（开发模式）。

## 性能优化建议

### 开发模式
- ✅ Vite HMR：秒级热更新
- ✅ tsx watch：API 自动重载
- ✅ React Query：智能缓存（3秒内不重复请求）

### 生产模式
- 🎯 Gzip 压缩（可配置）
- 🎯 静态资源缓存
- 🎯 构建优化（Vite）
- 🎯 服务端渲染（未来）

## 故障排查

### 端口被占用

```bash
# 检查
lsof -i:3001
lsof -i:5174

# 终止
kill -9 <PID>
```

### 服务无法启动

```bash
# 查看启动日志
cat logs/mcp-agent.log

# 测试配置
cd packages/cli
bun run dev -- --config=../../config/agent-config.json
```

### Proxy 不工作

1. 确认 Vite Dev Server 运行在 5174
2. 确认 API Server 运行在 3001
3. 检查 `packages/web/vite.config.ts` 的 proxy 配置
4. 清除浏览器缓存

## 下一步计划

- [ ] 实现 WebSocket 实时日志推送
- [ ] 添加插件安装功能
- [ ] 实现配置在线编辑
- [ ] 添加权限管理
- [ ] Docker 容器化
- [ ] CI/CD 流程
- [ ] 性能监控和告警

## 相关文档

- [架构文档](./ARCHITECTURE.md) - 详细的系统设计
- [API 文档](./API.md) - REST API 端点说明
- [开发指南](./DEVELOPMENT.md) - 如何扩展和贡献

---

**升级完成时间**: 2026-02-15  
**版本**: v0.2.0  
**测试状态**: ✅ 通过
