# 快速开始：多服务集成测试

## 📋 当前配置状态

你的配置文件已经包含以下服务示例：

### ✅ 已启用
- **Calculator (SSE)** - 需要先运行 http://localhost:8931

### 💤 已配置但未启用（可以随时开启）
- **Filesystem (Embedded)** - 需要实现模块
- **Filesystem (NPX/stdio)** - 通过 npx 启动，开箱即用
- **Memory (NPX/stdio)** - 通过 npx 启动，开箱即用
- **Weather (SSE)** - 需要运行服务
- **REST API (HTTP)** - 需要运行服务

## 🚀 快速测试 Stdio 模式

### 方法 1：启用 Memory Service（最简单）

Memory Service 无需任何配置，直接可用：

1. 编辑 `config/agent-config.json`：
```json
{
  "id": "memory-npx",
  "enabled": true,  // 改为 true
  // ...其他配置保持不变
}
```

2. 配置会自动热重载，无需重启

3. 查看日志：
```bash
tail -f logs/mcp-agent.log

# 应该看到：
# [info]: Service initialized: Memory Service {"toolCount":X}
```

### 方法 2：启用 Filesystem Service

如果要测试文件操作：

1. 修改路径（可选）：
```json
{
  "id": "filesystem-npx",
  "enabled": true,
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/Users/kangkang/Documents"  // 修改为你想要的目录
  ]
}
```

2. 保存配置，Agent 会自动重载

## 🧪 验证多服务集成

### 1. 检查服务状态

查看日志中的服务初始化信息：

```bash
grep "Service initialized" logs/mcp-agent.log | tail -10
```

你应该看到类似：
```
[info]: Service initialized: Calculator Service {"id":"calculator","toolCount":6}
[info]: Service initialized: Memory Service {"id":"memory-npx","toolCount":3}
[info]: Service initialized: Filesystem Service {"id":"filesystem-npx","toolCount":8}
```

### 2. 检查工具聚合

所有服务的工具会自动聚合，查看总数：

```bash
grep "tools available" logs/mcp-agent.log | tail -1
```

### 3. 在 xiaozhi 中测试

1. 访问 xiaozhi 界面
2. 应该能看到所有启用服务的工具
3. 测试调用不同服务的工具：
   - Calculator: `add`, `sub`, `mul`, `div`
   - Memory: `remember`, `recall`, `forget`
   - Filesystem: `read_file`, `write_file`, `list_directory`

## 🔧 Stdio 模式详解

### NPX 启动原理

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

等价于在终端执行：
```bash
npx -y @modelcontextprotocol/server-memory
```

- `npx`: Node.js 包执行器
- `-y`: 自动确认，无需手动输入
- 首次运行会自动下载包
- 后续运行使用缓存

### 环境变量传递

某些服务需要 API keys：

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
  }
}
```

### 本地开发服务

如果你有本地 MCP server：

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["/path/to/your/server/dist/index.js"]
}
```

或使用 Bun：
```json
{
  "command": "bun",
  "args": ["run", "/path/to/your/server/src/index.ts"]
}
```

## 📊 性能对比

| 模式 | 启动速度 | 内存占用 | 适用场景 |
|------|---------|---------|---------|
| **Stdio (NPX)** | 慢（首次）<br>快（缓存后） | 中等<br>（子进程） | 官方服务<br>快速测试 |
| **SSE** | 快 | 低 | 远程服务<br>生产环境 |
| **Embedded** | 最快 | 最低 | 自定义逻辑<br>高性能 |
| **HTTP** | 快 | 低 | REST API<br>现有后端 |

## 🐛 常见问题

### Q: Stdio 服务启动很慢？

**A:** 首次运行 `npx -y` 会下载包，之后会使用缓存。可以预先下载：

```bash
# 预先缓存常用服务
npx -y @modelcontextprotocol/server-memory --help
npx -y @modelcontextprotocol/server-filesystem --help
```

### Q: 服务初始化失败？

**A:** 检查日志中的详细错误：

```bash
grep -A 5 "Failed to initialize" logs/mcp-agent.log
```

常见原因：
- **命令不存在**：确保 `npx`/`node`/`bun` 已安装
- **路径错误**：检查 `args` 中的路径
- **权限问题**：某些服务需要文件系统权限
- **依赖缺失**：某些服务有额外依赖（如 Puppeteer 需要 Chrome）

### Q: 如何查看子进程日志？

**A:** Stdio 模式的标准输出会重定向到 Agent 日志：

```bash
grep "serviceId\":\"memory-npx" logs/mcp-agent.log
```

### Q: 多少个 Stdio 服务合适？

**A:** 建议不超过 10 个，因为：
- 每个服务一个子进程
- 内存占用会叠加
- 启动时间会增加

生产环境建议：
- 核心服务：3-5 个
- 按需启用：通过 `enabled` 控制

## 📚 更多资源

- [完整配置示例](../config/multi-services-example.json)
- [详细文档](./MULTI_SERVICES.md)
- [官方 MCP Servers](https://github.com/modelcontextprotocol/servers)
- [自定义服务开发](./CUSTOM_SERVICES.md)

## 🎯 推荐的测试步骤

1. **第一步**：只启用 Calculator（已启用）
   - 验证 SSE 模式正常工作

2. **第二步**：增加 Memory（stdio）
   - 无需额外配置，设置 `enabled: true`

3. **第三步**：增加 Filesystem（stdio）
   - 修改路径到合适的目录

4. **第四步**：测试工具调用
   - 在 xiaozhi 中测试不同服务的工具

5. **第五步**：根据需要添加更多服务
   - 参考 `multi-services-example.json`

---

遇到问题？查看 [故障排查指南](./TROUBLESHOOTING.md) 或提交 Issue。
