# MCP Agent

一个强大的 MCP (Model Context Protocol) 代理服务，用于聚合多个 MCP 服务并通过统一的 WebSocket 接口暴露给小智 AI 助手。

> 🚀 **包管理**: 本项目使用 [Bun](https://bun.sh) 作为包管理器，提供更快的安装速度和更好的性能。

## 特性

- ✅ **多适配器支持**: 支持 4 种 MCP 服务类型
  - `stdio`: 子进程通信（兼容标准 MCP 服务）
  - `embedded`: 进程内服务（性能最佳，启动快 30 倍）
  - `sse`: Server-Sent Events
  - `http`: REST API
  
- ✅ **动态服务管理**: 运行时加载/卸载服务，无需重启
- ✅ **配置热重载**: 监听配置文件变化，自动应用更新
- ✅ **工具聚合**: 自动聚合所有服务的工具列表
- ✅ **结果验证**: 自动验证和截断超大结果（可配置限制）
- ✅ **自动重连**: WebSocket 连接断开自动重连
- ✅ **完整类型定义**: TypeScript 严格模式，完善的类型系统
- ✅ **结构化日志**: Winston 日志框架，支持文件和控制台输出
- ✅ **事件驱动**: 基于 EventEmitter 的架构，易于扩展

## 快速开始

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd mcp-agent

# 安装依赖
bun install

# 编译
bun run build
```

### 配置

创建配置文件 `config/agent-config.json`:

```json
{
  "xiaozhi": {
    "endpoint": "ws://localhost:8080/mcp",
    "reconnectInterval": 5000,
    "maxReconnectAttempts": 10
  },
  "services": [
    {
      "id": "calculator",
      "type": "embedded",
      "name": "Calculator",
      "description": "Basic arithmetic operations",
      "enabled": true,
      "modulePath": "./dist/examples/calculator-service.js"
    }
  ],
  "logging": {
    "level": "info",
    "file": "./logs/mcp-agent.log"
  },
  "resultLimit": 1024
}
```

### 运行

```bash
# 使用默认配置
bun start

# 指定配置文件
bun start -- --config=./my-config.json

# 开发模式（自动重启）
bun run dev
```

## 架构

### 核心组件

```
┌─────────────────────────────────────────────┐
│              xiaozhi (WebSocket)            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          XiaozhiConnection                  │
│  - WebSocket 管理                            │
│  - 消息路由                                  │
│  - 自动重连                                  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           ToolAggregator                    │
│  - 工具发现与聚合                            │
│  - 工具调用路由                              │
│  - 结果验证                                  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          ServiceRegistry                    │
│  - 服务注册与管理                            │
│  - 生命周期控制                              │
│  - 状态监控                                  │
└─────────────┬───┬───┬───┬───────────────────┘
              │   │   │   │
        ┌─────┘   │   │   └─────┐
        │         │   │         │
    ┌───▼──┐  ┌──▼─┐ ┌▼──┐  ┌──▼───┐
    │Stdio │  │Emb │ │SSE│  │HTTP  │
    │      │  │    │ │   │  │      │
    └──────┘  └────┘ └───┘  └──────┘
```

### 目录结构

```
mcp-agent/
├── src/
│   ├── types/           # 类型定义
│   │   ├── mcp.ts       # MCP 协议类型
│   │   ├── config.ts    # 配置类型 + Zod 验证
│   │   ├── xiaozhi.ts   # 小智协议类型
│   │   └── errors.ts    # 错误类型
│   │
│   ├── utils/           # 工具函数
│   │   ├── logger.ts           # Winston 日志
│   │   └── result-validator.ts # 结果验证
│   │
│   ├── adapters/        # 服务适配器
│   │   ├── base-adapter.ts     # 抽象基类
│   │   ├── stdio-adapter.ts    # 子进程适配器
│   │   ├── embedded-adapter.ts # 内嵌适配器
│   │   ├── sse-adapter.ts      # SSE 适配器
│   │   └── http-adapter.ts     # HTTP 适配器
│   │
│   ├── core/            # 核心模块
│   │   ├── service-registry.ts    # 服务注册表
│   │   ├── tool-aggregator.ts     # 工具聚合器
│   │   ├── xiaozhi-connection.ts  # 小智连接
│   │   └── mcp-agent.ts           # 主代理类
│   │
│   ├── config/          # 配置管理
│   │   └── config-loader.ts  # 配置加载器
│   │
│   ├── index.ts         # 导出入口
│   └── cli.ts           # 命令行入口
│
├── examples/            # 示例服务
│   └── calculator-service.ts
│
├── config/              # 配置文件
│   └── agent-config.json
│
├── tests/               # 测试
│   ├── unit/
│   └── integration/
│
└── docs/                # 文档
    ├── ARCHITECTURE.md          # 架构文档
    ├── TECHNICAL_SPEC.md        # 技术规范
    ├── IMPLEMENTATION_PLAN.md   # 实现计划
    ├── DESIGN_REVIEW.md         # 设计评审
    ├── QUICK_START.md           # 快速开始
    └── GUI_ARCHITECTURE.md      # GUI 架构
```

## 使用指南

### 1. 添加 Stdio 服务

```json
{
  "id": "my-service",
  "type": "stdio",
  "name": "My Service",
  "enabled": true,
  "command": "node",
  "args": ["./path/to/service.js"],
  "env": {
    "API_KEY": "your-key"
  }
}
```

### 2. 添加 Embedded 服务

创建服务文件 `services/my-service.ts`:

```typescript
import { IMCPService, ... } from 'mcp-agent';

export function create(options) {
  return {
    async initialize() { ... },
    async listTools() { ... },
    async callTool(request) { ... },
    async close() { ... }
  };
}
```

配置:

```json
{
  "id": "my-service",
  "type": "embedded",
  "name": "My Service",
  "enabled": true,
  "modulePath": "./dist/services/my-service.js",
  "options": {
    "customOption": "value"
  }
}
```

### 3. 监听事件

```typescript
import { MCPAgent } from 'mcp-agent';

const agent = new MCPAgent('./config.json');

agent.on('agent:ready', () => {
  console.log('Agent is ready!');
});

agent.on('agent:error', (error) => {
  console.error('Error:', error);
});

await agent.start();
```

## API 参考

### MCPAgent

主代理类：

```typescript
class MCPAgent extends EventEmitter {
  constructor(configPath: string)
  
  async start(): Promise<void>
  async stop(): Promise<void>
  async restart(): Promise<void>
  
  getStatus(): AgentStatus
  getRegistry(): ServiceRegistry
  getAggregator(): ToolAggregator
  getConnection(): XiaozhiConnection
  getConfig(): MCPAgentConfig
}
```

### ServiceRegistry

服务注册表：

```typescript
class ServiceRegistry extends EventEmitter {
  async register(config: ServiceConfig): Promise<void>
  async unregister(serviceId: string): Promise<void>
  
  async start(serviceId: string): Promise<void>
  async stop(serviceId: string): Promise<void>
  async restart(serviceId: string): Promise<void>
  
  get(serviceId: string): BaseServiceAdapter | undefined
  has(serviceId: string): boolean
  getServiceIds(): string[]
  getRunningServices(): BaseServiceAdapter[]
  getAllMetadata(): MCPServiceMetadata[]
  
  async startAll(): Promise<void>
  async stopAll(): Promise<void>
  async clear(): Promise<void>
  
  getStats(): RegistryStats
}
```

### ToolAggregator

工具聚合器：

```typescript
class ToolAggregator {
  async getAllTools(): Promise<AggregatedTool[]>
  async findTool(toolName: string): Promise<AggregatedTool | undefined>
  async callTool(request: CallToolRequest): Promise<CallToolResult>
  async hasTool(toolName: string): Promise<boolean>
  async getToolsByService(): Promise<Map<string, AggregatedTool[]>>
  async getStats(): Promise<ToolStats>
}
```

## 开发

### 测试

```bash
# 运行所有测试
bun test

# 运行特定测试
bun test -- --testPathPattern=service-registry

# 覆盖率报告
bun test -- --coverage
```

### 代码质量

```bash
# ESLint 检查
bun run lint

# 格式化代码
bun run format

# 类型检查
bun run type-check
```

## 性能优化

### Embedded vs Stdio 性能对比

| 指标 | Embedded | Stdio |
|------|----------|-------|
| 启动时间 | ~100ms | ~3000ms |
| 内存开销 | 共享进程 | 独立进程 |
| 通信延迟 | 函数调用 | IPC |
| 隔离性 | 低 | 高 |

**建议**: 
- 高频调用的服务使用 `embedded`
- 第三方不可信服务使用 `stdio`
- 远程服务使用 `sse` 或 `http`

## 故障排查

### 服务启动失败

检查日志文件 `./logs/mcp-agent.log`:

```bash
tail -f ./logs/mcp-agent.log
```

常见问题：
- 配置文件格式错误 → 使用 JSON validator 验证
- 模块路径错误 → 确保使用编译后的 `.js` 路径
- 端口被占用 → 检查 `xiaozhi.endpoint` 配置

### WebSocket 连接失败

1. 确认小智端点可访问
2. 检查防火墙设置
3. 查看重连日志

### 工具调用失败

1. 确认服务状态: `agent.getRegistry().getStats()`
2. 检查工具名称是否正确
3. 验证参数格式

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT

## 相关文档

- [架构文档](docs/ARCHITECTURE.md)
- [技术规范](docs/TECHNICAL_SPEC.md)
- [实现计划](docs/IMPLEMENTATION_PLAN.md)
- [设计评审](docs/DESIGN_REVIEW.md)
- [GUI 架构](docs/GUI_ARCHITECTURE.md)

## 致谢

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [小智 AI](https://xiaozhi.ai/)
 - MCP代理服务

> 一个强大的MCP代理服务，将多个已有的MCP服务转换为支持小智AI接入，支持动态加载、卸载MCP服务。

## 📋 项目状态

- **版本**: v0.1.0 (设计阶段)
- **技术栈**: TypeScript + Node.js
- **设计完成度**: 100%
- **开发进度**: 准备开始

## ✨ 核心特性

- 🔌 **多服务类型支持**: stdio、SSE、HTTP、embedded
- 🔄 **自动重连**: 指数退避机制（1s ~ 60s）
- 🛠️ **工具命名空间**: 避免工具名冲突
- 🔥 **配置热重载**: 无需重启，动态更新服务
- 💪 **健康检查**: 自动检测服务状态
- 📏 **结果大小限制**: 符合小智1024字节限制
- 🎯 **错误隔离**: 单个服务故障不影响其他服务

## 📚 文档结构

- [架构设计](docs/ARCHITECTURE.md) - 系统架构和核心模块设计
- [技术规范](docs/TECHNICAL_SPEC.md) - 类型系统、接口规范、错误处理
- [实施计划](docs/IMPLEMENTATION_PLAN.md) - 详细的开发计划和里程碑
- [设计审查](docs/DESIGN_REVIEW.md) - 设计模式审查和改进建议

## 🚀 快速开始（即将支持）

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑.env，设置MCP_ENDPOINT

# 启动服务
npm start
```

## 📖 参考资料

### 小智 AI 服务
- [MCP 接入规范](https://my.feishu.cn/wiki/HiPEwZ37XiitnwktX13cEM5KnSb)
- [官方示例：mcp-calculator](https://github.com/78/mcp-calculator)

### 参考实现
- [mcp_server_exe](https://github.com/shadowcz007/mcp_server_exe)

## ⚙️ 配置示例

```json
{
  "xiaozhi": {
    "endpoint": "${MCP_ENDPOINT}"
  },
  "services": {
    "calculator": {
      "type": "stdio",
      "enabled": true,
      "command": "python",
      "args": ["-m", "calculator"],
      "namespace": "calc"
    },
    "filesystem": {
      "type": "embedded",
      "enabled": true,
      "module": "@modelcontextprotocol/server-filesystem",
      "namespace": "fs"
    }
  }
}
```

## 🏗️ 项目架构

```
┌──────────────┐
│    小智 AI    │
└──────┬───────┘
       │ WebSocket
┌──────▼───────┐
│ MCP Agent    │
│ Manager      │
└──────┬───────┘
       │
   ┌───┴───┬────────┐
   ▼       ▼        ▼
 Stdio  Embedded  SSE/HTTP
 Adapter Adapter  Adapter
   │       │        │
 Python  Node.js  Remote
  MCP     MCP      MCP
```

## ⚠️ 注意事项

### 1. 工具命名规范
- ✅ 使用清晰的描述性名称，避免缩写
- ✅ 参数名要明确表达含义
- ✅ 提供详细的工具描述和使用场景
- ❌ 不要：`calc(expr)` 
- ✅ 应该：`calculator(python_expression)`

### 2. 标准输入输出
由于stdio被用于数据传输：
- ❌ 不能使用`print()`输出调试信息
- ✅ 使用`logger`记录日志
- ✅ 使用`sys.stderr`输出错误

### 3. 返回值限制
- 📏 单个工具返回≤1024字节
- 📏 工具列表总大小有限制（token计算）
- 📏 超限会自动截断并警告

### 4. 资源限制
- 👥 每个MCP接入点连接数有上限
- 💾 注意内存使用（特别是子进程）
- ⏱️ 工具执行建议设置超时

### 5. 错误处理
- 🔄 单个服务故障不影响其他服务
- 🔄 WebSocket断开自动重连
- 🔄 配置错误会清晰提示

## 🛠️ 开发计划

- [x] Phase 1: 架构设计（已完成）
- [ ] Phase 2: 基础设施搭建（第1-2天）
- [ ] Phase 3: 核心适配器实现（第3-5天）
- [ ] Phase 4: 工具管理和聚合（第6-7天）
- [ ] Phase 5: WebSocket客户端（第8-9天）
- [ ] Phase 6: 配置管理（第10-11天）
- [ ] Phase 7: 测试和文档（第12-14天）

详见 [实施计划](docs/IMPLEMENTATION_PLAN.md)

## 📊 设计审查结果

**总体评分**: ⭐⭐⭐⭐★ (4.6/5)

| 维度 | 评分 |
|-----|------|
| 设计模式 | ⭐⭐⭐⭐⭐ |
| 架构清晰度 | ⭐⭐⭐⭐⭐ |
| 扩展性 | ⭐⭐⭐⭐ |
| 性能 | ⭐⭐⭐⭐ |
| 可维护性 | ⭐⭐⭐⭐⭐ |

详见 [设计审查文档](docs/DESIGN_REVIEW.md)

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [MCP官方项目](https://modelcontextprotocol.io/)
- [小智AI团队](https://xiaozhi.me/)
- 所有贡献者

---

**最后更新**: 2026-02-14  
**项目状态**: 🟡 设计阶段


### 注意事项⚠️
1. MCP里工具的名字和参数的命名一定要清晰的让大模型知道它的作用，尽量不要用缩写，同时提供一段注释来说明工具的作用以及在何时使用。例如calculator让大模型知道它是个计算器，参数python_expression是要求大模型输入一个Python表达式。如果你要写一个bing_search工具，那么它的参数名应该是keywords。
2. 函数内的文档注释（使用"""..."""引用的部分）引导大模型何时使用该工具，同时提及了可以在表达式中使用math和random两个库里的函数，这两个库我们已经在前面的代码中import进来了。
3. 由于本示例项目中MCP Server中的标准输入输出被用来做数据传输，所以无法使用print来打印信息，改为通过logger来输出调试信息。
4. MCP的返回值通常是一个字符串或者JSON，示例中把计算结果放在一个JSON的result字段里进行返回。返回值的长度通常是有限制的，跟设备上的IoT指令一样，通常限制在1024字节内。
5. MCP的工具列表报文是有上限的，后期会在配置页面中显示，以token数计算。
6. 每个MCP接入点的连接数是有上限的。