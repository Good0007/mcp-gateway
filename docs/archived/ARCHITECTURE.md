# MCP Agent 架构设计文档

> 版本：v0.1.0  
> 日期：2026-02-14  
> 状态：设计阶段

## 1. 项目概述

### 1.1 目标
构建一个MCP代理服务，将多个已有的MCP服务转换为支持小智AI接入的统一服务，支持动态加载、卸载MCP服务。

### 1.2 核心特性
- ✅ WebSocket客户端连接小智端点
- ✅ 多种MCP服务类型支持（stdio、SSE、HTTP、embedded）
- ✅ 工具命名空间管理，避免冲突
- ✅ 配置热重载
- ✅ 服务健康检查
- ✅ 结果大小限制（1024字节）
- ✅ 自动重连机制（指数退避）
- ✅ 优雅关闭和错误隔离

### 1.3 技术选型

| 技术项 | 选择 | 理由 |
|--------|------|------|
| 语言 | TypeScript | 类型安全、与MCP生态一致 |
| 运行时 | Node.js 18+ | 异步IO优秀、生态丰富 |
| MCP SDK | @modelcontextprotocol/sdk | 官方SDK，功能完整 |
| WebSocket | ws | 性能好、API简洁 |
| 配置验证 | zod | 类型安全的schema验证 |
| 日志 | winston | 功能强大、格式灵活 |
| 进程管理 | execa | 更好的子进程API |
| 文件监听 | chokidar | 跨平台、功能完整 |

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│         小智 AI WebSocket 端点                       │
│      wss://api.xiaozhi.me/mcp/?token=xxx            │
└────────────────────┬────────────────────────────────┘
                     │ WebSocket Protocol
                     │ (JSON-RPC 2.0)
                     │
┌────────────────────▼────────────────────────────────┐
│         XiaozhiWebSocketClient                      │
│  ┌──────────────────────────────────────────┐      │
│  │ - 连接管理（connect/disconnect）          │      │
│  │ - 自动重连（指数退避：1s ~ 60s）          │      │
│  │ - 心跳检测（ping/pong）                   │      │
│  │ - 消息路由（request → response）          │      │
│  └──────────────────────────────────────────┘      │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│          MCPAgentManager (主控制器)                 │
│  ┌──────────────────────────────────────────┐      │
│  │ - 生命周期管理（initialize/start/stop）   │      │
│  │ - 配置加载和热重载                         │      │
│  │ - 组件协调                                 │      │
│  │ - 状态监控                                 │      │
│  └──────────────────────────────────────────┘      │
└─────┬──────────────┬──────────────┬────────────────┘
      │              │              │
      │              │              │
┌─────▼──────┐ ┌─────▼──────┐ ┌────▼────────┐
│ Service    │ │ Tool       │ │ Config      │
│ Registry   │ │ Aggregator │ │ Manager     │
│            │ │            │ │             │
│- 服务注册  │ │- 工具聚合  │ │- 加载配置   │
│- 生命周期  │ │- 命名空间  │ │- 验证配置   │
│- 健康检查  │ │- 路由转发  │ │- 监听变更   │
│- 查询服务  │ │- 结果验证  │ │- 热重载     │
└─────┬──────┘ └────────────┘ └─────────────┘
      │
      │ 1:N
      │
┌─────▼──────────────────────────────────────────────┐
│         IMCPServiceAdapter (适配器接口)             │
│  ┌──────────────────────────────────────────┐      │
│  │ + start(): Promise<void>                 │      │
│  │ + stop(): Promise<void>                  │      │
│  │ + listTools(): Promise<Tool[]>           │      │
│  │ + callTool(name, args): Promise<Result>  │      │
│  │ + isHealthy(): Promise<boolean>          │      │
│  └──────────────────────────────────────────┘      │
└──────┬──────────┬──────────┬──────────┬────────────┘
       │          │          │          │
   ┌───▼───┐  ┌──▼───┐  ┌───▼───┐  ┌──▼──────┐
   │Stdio  │  │SSE   │  │HTTP   │  │Embedded │
   │Adapter│  │Adapt │  │Adapt  │  │Adapter  │
   └───┬───┘  └──┬───┘  └───┬───┘  └──┬──────┘
       │         │          │          │
   ┌───▼───┐ ┌──▼────┐ ┌───▼────┐ ┌──▼──────┐
   │Python │ │Remote │ │Remote  │ │Node.js  │
   │ MCP   │ │SSE MCP│ │HTTP MCP│ │MCP直接  │
   │Process│ │Server │ │Server  │ │内存集成 │
   └───────┘ └───────┘ └────────┘ └─────────┘
```

### 2.2 数据流

#### 2.2.1 工具列表请求流程
```
小智端点 → WebSocket → MCPAgent → ToolAggregator
                                       ↓
                            遍历所有ServiceAdapter
                                       ↓
                            并发调用listTools()
                                       ↓
                            应用命名空间前缀
                                       ↓
                            应用过滤规则
                                       ↓
                            验证大小限制
                                       ↓
                            聚合返回
                                       ↓
                         WebSocket → 小智端点
```

#### 2.2.2 工具调用流程
```
小智端点 → WebSocket → MCPAgent → ToolAggregator
                                       ↓
                            解析命名空间
                                       ↓
                         查找对应ServiceAdapter
                                       ↓
                          调用callTool()
                                       ↓
                          验证结果大小
                                       ↓
                          (超限则截断)
                                       ↓
                         WebSocket → 小智端点
```

### 2.3 目录结构

```
mcp-agent/
├── src/                        # 源代码
│   ├── core/                   # 核心模块
│   │   ├── manager.ts          # 主控制器
│   │   ├── registry.ts         # 服务注册中心
│   │   ├── websocket-client.ts # WebSocket客户端
│   │   └── tool-aggregator.ts  # 工具聚合器
│   ├── adapters/               # 适配器实现
│   │   ├── base.ts             # 基础接口和抽象类
│   │   ├── stdio.ts            # Stdio适配器
│   │   ├── sse.ts              # SSE适配器
│   │   ├── http.ts             # HTTP适配器
│   │   └── embedded.ts         # 嵌入式适配器
│   ├── config/                 # 配置管理
│   │   ├── schema.ts           # Zod验证模式
│   │   ├── loader.ts           # 配置加载器
│   │   └── watcher.ts          # 配置监听器
│   ├── types/                  # 类型定义
│   │   ├── mcp.ts              # MCP协议类型
│   │   ├── config.ts           # 配置类型
│   │   └── xiaozhi.ts          # 小智协议类型
│   ├── utils/                  # 工具函数
│   │   ├── logger.ts           # 日志工具
│   │   ├── health-check.ts     # 健康检查
│   │   └── result-validator.ts # 结果验证
│   └── index.ts                # 入口文件
├── config/                     # 配置文件
│   └── mcp-agent.config.json   # 默认配置
├── docs/                       # 文档
│   ├── ARCHITECTURE.md         # 架构设计（本文档）
│   ├── TECHNICAL_SPEC.md       # 技术规范
│   └── IMPLEMENTATION_PLAN.md  # 实施计划
├── examples/                   # 示例
├── tests/                      # 测试
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript配置
└── README.md                   # 项目说明
```

## 3. 核心模块设计

### 3.1 适配器模式（Adapter Pattern）

**设计原则**：通过适配器模式统一不同类型MCP服务的接口。

**接口定义**：
```typescript
interface IMCPServiceAdapter {
  readonly name: string;
  readonly namespace: string;
  readonly type: ServiceType;
  readonly status: ServiceStatus;
  
  start(): Promise<void>;
  stop(): Promise<void>;
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: any): Promise<CallToolResult>;
  isHealthy(): Promise<boolean>;
}
```

**继承层次**：
```
IMCPServiceAdapter (接口)
         ↑
BaseServiceAdapter (抽象类，实现通用逻辑)
         ↑
    ┌────┴────┬─────────┬─────────┐
StdioAdapter SSEAdapter HTTPAdapter EmbeddedAdapter
```

**优势**：
- 统一接口，简化上层调用
- 易于扩展新的服务类型
- 服务隔离，故障不传播

### 3.2 注册中心模式（Registry Pattern）

**职责**：
- 集中管理所有服务适配器实例
- 提供服务查询能力（按名称、命名空间）
- 协调服务生命周期
- 定期健康检查

**关键方法**：
```typescript
class ServiceRegistry {
  register(adapter: IMCPServiceAdapter): void;
  unregister(name: string): Promise<void>;
  get(name: string): IMCPServiceAdapter | undefined;
  getByNamespace(ns: string): IMCPServiceAdapter | undefined;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
}
```

### 3.3 聚合器模式（Aggregator Pattern）

**职责**：
- 聚合多个服务的工具列表
- 应用命名空间前缀
- 路由工具调用到正确的服务
- 应用过滤规则和大小限制

**工具命名规则**：
```
原始工具名: calculator
命名空间: calc
聚合后: calc.calculator
```

**路由逻辑**：
```typescript
// 解析 "calc.calculator" → { namespace: "calc", tool: "calculator" }
// 查找 namespace="calc" 的服务
// 调用该服务的 callTool("calculator", args)
```

### 3.4 观察者模式（Observer Pattern）

**应用场景**：配置文件变更监听

```typescript
class ConfigWatcher {
  // 监听文件变更
  start(): void;
  
  // 触发回调
  private handleChange(): void {
    this.onChange(newConfig); // 通知MCPAgentManager
  }
}

class MCPAgentManager {
  private handleConfigChange(newConfig: MCPAgentConfig) {
    // 差异化更新服务
  }
}
```

## 4. 关键设计决策

### 4.1 为何选择Node.js而非Python？

| 考量维度 | Node.js | Python | 决策 |
|---------|---------|--------|------|
| MCP生态 | 原生SDK，70%服务 | fastmcp，20%服务 | ✅ Node.js |
| 深度集成 | 可直接import MCP模块 | 仅进程调用 | ✅ Node.js |
| GUI开发 | Electron/Web自然 | 需额外框架 | ✅ Node.js |
| 小智协议 | 需实现WS客户端 | 有官方demo | Python略胜 |
| 综合评分 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Node.js |

### 4.2 Embedded模式的价值

**传统stdio模式**：
```
启动时间：1-3秒
通信方式：进程间IPC
开销：高（序列化、进程切换）
```

**Embedded模式**：
```
启动时间：<100ms
通信方式：内存调用
开销：极低
```

**适用场景**：
- Node.js编写的MCP服务
- 需要高性能的场景
- 开发调试阶段

### 4.3 命名空间设计

**目标**：解决工具名冲突问题

**方案**：
```json
{
  "services": {
    "calc1": { "namespace": "calc" },
    "calc2": { "namespace": "math" }
  }
}
```

**效果**：
```
calc1的"add"工具 → "calc.add"
calc2的"add"工具 → "math.add"
```

### 4.4 错误隔离策略

**原则**：单个服务故障不影响其他服务

**实现**：
1. 每个适配器独立的错误处理
2. 工具调用失败返回错误，不抛异常
3. 服务崩溃触发重启（可选）
4. 健康检查自动摘除不健康服务

## 5. 扩展性设计

### 5.1 新增服务类型

**步骤**：
1. 创建新的适配器类继承`BaseServiceAdapter`
2. 实现必需的抽象方法
3. 在配置schema中添加新类型
4. 在`MCPAgentManager.initializeServices()`中添加创建逻辑

**示例**：添加gRPC类型
```typescript
class GrpcServiceAdapter extends BaseServiceAdapter {
  async start(): Promise<void> { /* 实现 */ }
  async listTools(): Promise<Tool[]> { /* 实现 */ }
  // ...
}
```

### 5.2 插件机制（未来）

**设想**：支持用户自定义适配器

```typescript
interface IAdapterPlugin {
  name: string;
  createAdapter(config: any): IMCPServiceAdapter;
}

// 用户可以注册插件
registry.registerPlugin(myCustomPlugin);
```

### 5.3 监控和指标（未来）

**扩展点**：
```typescript
interface IMetricsCollector {
  recordToolCall(tool: string, duration: number, success: boolean): void;
  recordServiceHealth(service: string, healthy: boolean): void;
}
```

## 6. 安全性考虑

### 6.1 配置验证

- 使用Zod进行严格的类型验证
- 拒绝不合法的配置
- 环境变量解析防止注入

### 6.2 进程隔离

- stdio服务运行在独立进程
- 限制子进程权限（可选）
- 超时保护，防止僵尸进程

### 6.3 结果大小限制

- 限制单个工具返回结果≤1024字节
- 自动截断超长结果
- 记录警告日志

## 7. 性能优化

### 7.1 并发处理

- 工具列表查询：并发调用所有服务
- 使用`Promise.all()`而非串行

### 7.2 连接复用

- Embedded模式：内存调用，零开销
- SSE/HTTP：保持长连接或连接池

### 7.3 配置热重载

- 差异化更新：只重启变更的服务
- 防抖处理：避免频繁重载

## 8. 测试策略

### 8.1 单元测试
- 每个适配器独立测试
- Mock外部依赖
- 覆盖率目标：>80%

### 8.2 集成测试
- 真实服务协同测试
- 配置热重载测试
- 错误恢复测试

### 8.3 端到端测试
- 连接真实小智端点
- 完整工具调用流程
- 压力测试

## 9. 未来规划

### 9.1 Phase 1 - MVP（当前）
- ✅ 核心适配器（stdio、embedded）
- ✅ WebSocket客户端
- ✅ 工具聚合和路由
- ✅ 配置热重载

### 9.2 Phase 2 - 增强
- 🔲 SSE/HTTP适配器
- 🔲 GUI管理界面（Web）
- 🔲 性能监控和指标
- 🔲 更完善的错误处理

### 9.3 Phase 3 - 高级特性
- 🔲 工具链支持（多工具组合）
- 🔲 插件机制
- 🔲 Electron桌面应用
- 🔲 分布式部署支持

## 10. 参考资料

- [MCP官方文档](https://modelcontextprotocol.io/)
- [小智MCP接入规范](https://my.feishu.cn/wiki/HiPEwZ37XiitnwktX13cEM5KnSb)
- [官方示例：mcp-calculator](https://github.com/78/mcp-calculator)
- [参考实现：mcp_server_exe](https://github.com/shadowcz007/mcp_server_exe)

---

**文档维护**：
- 创建日期：2026-02-14
- 最后更新：2026-02-14
- 负责人：开发团队
- 审核状态：待审核
