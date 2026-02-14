# MCP Agent 技术规范文档

> 版本：v0.1.0  
> 日期：2026-02-14  
> 状态：设计阶段

## 1. 类型系统

### 1.1 MCP协议类型 (`src/types/mcp.ts`)

```typescript
// 工具定义
export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

// JSON Schema简化定义
export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
}

// 工具调用请求
export interface CallToolRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
}

// 工具调用结果
export interface CallToolResult {
  content: ContentItem[];
  isError?: boolean;
}

export interface ContentItem {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

// 工具列表请求/响应
export interface ListToolsRequest {
  method: 'tools/list';
}

export interface ListToolsResponse {
  tools: Tool[];
}
```

### 1.2 配置类型 (`src/types/config.ts`)

```typescript
// 服务类型枚举
export type ServiceType = 'stdio' | 'sse' | 'http' | 'embedded';
export type ServiceStatus = 'stopped' | 'starting' | 'running' | 'error';

// 小智连接配置
export interface XiaozhiConfig {
  endpoint: string;
  reconnect: ReconnectConfig;
}

export interface ReconnectConfig {
  initialBackoff: number;  // 毫秒
  maxBackoff: number;      // 毫秒
}

// 服务配置基类
export interface BaseServiceConfig {
  type: ServiceType;
  enabled: boolean;
  namespace: string;
  healthCheck?: HealthCheckConfig;
}

export interface HealthCheckConfig {
  interval: number;  // 毫秒
  timeout: number;   // 毫秒
}

// Stdio服务配置
export interface StdioServiceConfig extends BaseServiceConfig {
  type: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

// SSE服务配置
export interface SSEServiceConfig extends BaseServiceConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

// HTTP服务配置
export interface HTTPServiceConfig extends BaseServiceConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

// Embedded服务配置
export interface EmbeddedServiceConfig extends BaseServiceConfig {
  type: 'embedded';
  module: string;
  config?: Record<string, any>;
}

// 联合类型
export type ServiceConfig = 
  | StdioServiceConfig 
  | SSEServiceConfig 
  | HTTPServiceConfig 
  | EmbeddedServiceConfig;

// 工具管理配置
export interface ToolManagerConfig {
  maxToolListSize: number;      // 字节
  maxResultSize: number;         // 字节
  namespaceEnabled: boolean;
  namespaceSeparator: string;
  whitelist: string[];           // 工具白名单
  blacklist: string[];           // 工具黑名单
}

// 日志配置
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: string;
  file?: string;
}

// 完整配置
export interface MCPAgentConfig {
  xiaozhi: XiaozhiConfig;
  services: Record<string, ServiceConfig>;
  toolManager: ToolManagerConfig;
  logging: LoggingConfig;
}
```

## 2. 核心接口规范

### 2.1 服务适配器接口

```typescript
// src/adapters/base.ts

export interface IMCPServiceAdapter {
  // 只读属性
  readonly name: string;
  readonly namespace: string;
  readonly type: ServiceType;
  readonly status: ServiceStatus;
  
  // 生命周期管理
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  
  // MCP协议方法
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: Record<string, any>): Promise<CallToolResult>;
  
  // 健康检查
  isHealthy(): Promise<boolean>;
  
  // 事件监听
  on(event: 'error' | 'status-change', listener: (...args: any[]) => void): void;
  off(event: 'error' | 'status-change', listener: (...args: any[]) => void): void;
}

// 抽象基类
export abstract class BaseServiceAdapter implements IMCPServiceAdapter {
  protected logger: Logger;
  protected eventEmitter: EventEmitter;
  protected _status: ServiceStatus = 'stopped';
  
  constructor(
    public readonly name: string,
    public readonly namespace: string,
    public readonly type: ServiceType,
    protected config: ServiceConfig
  ) {
    this.logger = Logger.getInstance().child({ service: name });
    this.eventEmitter = new EventEmitter();
  }
  
  get status(): ServiceStatus {
    return this._status;
  }
  
  protected setStatus(status: ServiceStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.eventEmitter.emit('status-change', status);
    }
  }
  
  // 抽象方法，子类必须实现
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract listTools(): Promise<Tool[]>;
  abstract callTool(name: string, args: Record<string, any>): Promise<CallToolResult>;
  abstract isHealthy(): Promise<boolean>;
  
  // 通用方法
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
  
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
  
  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
  
  protected emitError(error: Error): void {
    this.logger.error(`Service error: ${error.message}`, { error });
    this.eventEmitter.emit('error', error);
  }
}
```

### 2.2 注册中心接口

```typescript
// src/core/registry.ts

export class ServiceRegistry {
  private adapters: Map<string, IMCPServiceAdapter> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(private logger: Logger) {}
  
  // 注册服务
  register(adapter: IMCPServiceAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Service ${adapter.name} already registered`);
    }
    
    this.adapters.set(adapter.name, adapter);
    
    // 启动健康检查
    this.startHealthCheck(adapter);
    
    this.logger.info(`Service registered: ${adapter.name}`, {
      namespace: adapter.namespace,
      type: adapter.type
    });
  }
  
  // 其他方法签名...
  unregister(name: string): Promise<void>;
  get(name: string): IMCPServiceAdapter | undefined;
  getAll(): IMCPServiceAdapter[];
  getByNamespace(namespace: string): IMCPServiceAdapter | undefined;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
}
```

### 2.3 工具聚合器接口

```typescript
// src/core/tool-aggregator.ts

export class ToolAggregator {
  constructor(
    private registry: ServiceRegistry,
    private config: ToolManagerConfig,
    private logger: Logger
  ) {}
  
  // 聚合所有工具
  async listAllTools(): Promise<Tool[]> {
    const services = this.registry.getAll();
    const toolsPerService = await Promise.all(
      services.map(s => s.listTools().catch(() => []))
    );
    
    let allTools: Tool[] = [];
    services.forEach((service, index) => {
      const tools = toolsPerService[index];
      const namespacedTools = tools.map(tool => 
        this.applyNamespace(tool, service.namespace)
      );
      allTools.push(...namespacedTools);
    });
    
    allTools = this.filterTools(allTools);
    this.validateToolListSize(allTools);
    
    return allTools;
  }
  
  // 调用工具
  async callTool(toolName: string, args: Record<string, any>): Promise<CallToolResult> {
    const { namespace, toolName: actualName } = this.parseToolName(toolName);
    const service = this.registry.getByNamespace(namespace);
    
    if (!service) {
      throw new Error(`Service not found for namespace: ${namespace}`);
    }
    
    const result = await service.callTool(actualName, args);
    return this.validateResultSize(result);
  }
  
  // 私有方法签名...
  private applyNamespace(tool: Tool, namespace: string): Tool;
  private parseToolName(fullName: string): { namespace: string; toolName: string };
  private filterTools(tools: Tool[]): Tool[];
  private validateToolListSize(tools: Tool[]): void;
  private validateResultSize(result: CallToolResult): CallToolResult;
}
```

## 3. 配置验证规范

使用Zod进行配置验证：

```typescript
// src/config/schema.ts

import { z } from 'zod';

// 重连配置schema
const reconnectConfigSchema = z.object({
  initialBackoff: z.number().min(100).max(10000),
  maxBackoff: z.number().min(1000).max(300000)
});

// 小智配置schema
const xiaozhiConfigSchema = z.object({
  endpoint: z.string().url(),
  reconnect: reconnectConfigSchema
});

// 健康检查配置schema
const healthCheckConfigSchema = z.object({
  interval: z.number().min(1000),
  timeout: z.number().min(1000)
}).optional();

// 基础服务配置schema
const baseServiceConfigSchema = z.object({
  enabled: z.boolean(),
  namespace: z.string().min(1),
  healthCheck: healthCheckConfigSchema
});

// Stdio服务配置schema
const stdioServiceConfigSchema = baseServiceConfigSchema.extend({
  type: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional()
});

// Embedded服务配置schema
const embeddedServiceConfigSchema = baseServiceConfigSchema.extend({
  type: z.literal('embedded'),
  module: z.string(),
  config: z.record(z.any()).optional()
});

// 联合schema
const serviceConfigSchema = z.union([
  stdioServiceConfigSchema,
  embeddedServiceConfigSchema,
  // SSE和HTTP的schema...
]);

// 工具管理配置schema
const toolManagerConfigSchema = z.object({
  maxToolListSize: z.number().min(1024),
  maxResultSize: z.number().min(256).max(10240),
  namespaceEnabled: z.boolean(),
  namespaceSeparator: z.string().length(1),
  whitelist: z.array(z.string()),
  blacklist: z.array(z.string())
});

// 完整配置schema
export const mcpAgentConfigSchema = z.object({
  xiaozhi: xiaozhiConfigSchema,
  services: z.record(serviceConfigSchema),
  toolManager: toolManagerConfigSchema,
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    format: z.string(),
    file: z.string().optional()
  })
});

export type ValidatedConfig = z.infer<typeof mcpAgentConfigSchema>;
```

## 4. 错误处理规范

### 4.1 错误码定义

```typescript
// src/types/errors.ts

export enum ErrorCode {
  // 配置错误 (1xxx)
  CONFIG_LOAD_ERROR = 1001,
  CONFIG_VALIDATION_ERROR = 1002,
  CONFIG_ENV_VAR_MISSING = 1003,
  
  // 服务错误 (2xxx)
  SERVICE_START_ERROR = 2001,
  SERVICE_STOP_ERROR = 2002,
  SERVICE_TIMEOUT_ERROR = 2003,
  SERVICE_NOT_FOUND = 2004,
  SERVICE_UNHEALTHY = 2005,
  
  // 工具错误 (3xxx)
  TOOL_NOT_FOUND = 3001,
  TOOL_CALL_ERROR = 3002,
  TOOL_RESULT_TOO_LARGE = 3003,
  TOOL_LIST_TOO_LARGE = 3004,
  
  // 连接错误 (4xxx)
  WEBSOCKET_CONNECTION_ERROR = 4001,
  WEBSOCKET_AUTH_ERROR = 4002,
  WEBSOCKET_TIMEOUT = 4003,
  
  // 通用错误 (5xxx)
  UNKNOWN_ERROR = 5000
}

export class MCPAgentError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MCPAgentError';
  }
}
```

### 4.2 错误处理策略

| 错误类型 | 处理策略 | 是否重试 |
|---------|----------|---------|
| 配置错误 | 抛出异常，停止启动 | ❌ |
| 服务启动失败 | 记录错误，标记不健康 | ✅ 有限次数 |
| 工具调用失败 | 返回错误结果 | ❌ |
| WebSocket断开 | 自动重连（指数退避） | ✅ 无限次 |
| 结果超大 | 截断+警告 | ❌ |

## 5. 日志规范

### 5.1 日志级别

- **debug**: 详细调试信息（开发阶段）
- **info**: 常规操作信息（生产推荐）
- **warn**: 警告信息但不影响功能
- **error**: 错误信息需要关注

### 5.2 日志格式

```typescript
// Winston配置
const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          return `${timestamp} [${level}] [${service || 'main'}] ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        })
      )
    })
  ]
};
```

### 5.3 日志示例

```
2026-02-14T10:30:45.123Z [info] [manager] Starting MCP Agent Manager
2026-02-14T10:30:45.234Z [info] [registry] Service registered: calculator {"namespace":"calc","type":"stdio"}
2026-02-14T10:30:45.345Z [info] [websocket] Connected to xiaozhi endpoint
2026-02-14T10:30:50.123Z [info] [tool-aggregator] Tool called: calc.calculator {"args":{"python_expression":"1+1"}}
2026-02-14T10:30:50.456Z [warn] [tool-aggregator] Result size 1500 bytes exceeds limit 1024
2026-02-14T10:30:55.789Z [error] [stdio-adapter] Process crashed {"service":"calculator","exitCode":1}
```

## 6. 性能指标

### 6.1 性能要求

| 指标 | 目标值 | 说明 |
|-----|-------|------|
| 工具列表查询 | <1秒 | 聚合所有服务 |
| 工具调用延迟 | <2秒 | 不含实际工具执行时间 |
| WebSocket重连时间 | 1-60秒 | 指数退避 |
| 配置重载时间 | <3秒 | 差异化更新 |
| 内存占用 | <200MB | 不含子进程 |
| 并发服务数 | ≥10 | 同时管理 |

### 6.2 性能优化要点

1. **并发查询**：使用`Promise.all()`并发调用
2. **连接复用**：SSE/HTTP保持长连接
3. **缓存策略**：工具列表可缓存（可选）
4. **异步日志**：避免阻塞主流程

## 7. 安全性规范

### 7.1 配置安全

- 敏感信息使用环境变量
- 禁止配置文件中硬编码密钥
- 配置验证防止SQL注入等风险

### 7.2 进程安全

- 子进程超时保护（30秒）
- 限制子进程资源使用（可选）
- 防止僵尸进程

### 7.3 结果验证

- 强制1024字节限制
- 输入参数类型验证
- 防止无限循环工具调用

## 8. 测试规范

### 8.1 单元测试覆盖率

- 目标：>80%
- 关键模块：适配器、聚合器、注册中心

### 8.2 测试工具

- Jest: 测试框架
- ts-jest: TypeScript支持
- supertest: HTTP测试（未来GUI）

### 8.3 测试示例

```typescript
// tests/unit/adapters/stdio.test.ts

describe('StdioServiceAdapter', () => {
  it('should start process successfully', async () => {
    const adapter = new StdioServiceAdapter(
      'test', 'test', 
      { type: 'stdio', command: 'node', args: ['test.js'] }
    );
    
    await adapter.start();
    expect(adapter.status).toBe('running');
  });
  
  it('should list tools', async () => {
    const tools = await adapter.listTools();
    expect(tools).toBeInstanceOf(Array);
  });
});
```

---

**文档维护**：
- 创建日期：2026-02-14
- 最后更新：2026-02-14
- 审核状态：待审核
