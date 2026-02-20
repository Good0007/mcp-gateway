# Mcp Gateway 架构设计

> 技术文档 - 面向开发者和架构师

## 📐 项目概况

Mcp Gateway 是基于 Bun + TypeScript 开发的 Monorepo 项目，采用模块化架构设计，旨在成为连接 AI 助手（如小智、Trae）与各种工具服务的通用网关。

### 技术栈

- **运行时**: 
  - **开发环境**: Bun 1.3+ (极速构建与运行)
  - **生产环境**: Node.js 24+ LTS (稳定运行服务), Bun (作为包管理器和工具运行时)
- **语言**: TypeScript 5.x (全栈类型安全)
- **前端**: React 18 + Vite + TailwindCSS + Shadcn/ui
- **后端**: Hono (高性能 Web 框架)
- **包管理**: Bun Workspaces (Monorepo 管理)
- **容器化**: Docker (多阶段构建) + Docker Compose
- **核心协议**: Model Context Protocol (MCP) SDK

## 🏗️ 系统架构

Mcp Gateway 充当了 MCP 客户端（如小智、Trae/VSCode）与 MCP 服务（如文件系统、GitHub、Fetch）之间的中间件/聚合层。

```mermaid
graph TD
    subgraph "Clients (客户端)"
        XiaoZhi[小智 (XiaoZhi)]
        Trae[Trae / VSCode]
        WebUI[Web Management UI]
    end

    subgraph "Mcp Gateway (网关)"
        subgraph "Interface Layer (接口层)"
            APIServer[API Server (Hono)]
            SSEEndpoint[SSE Endpoint (/sse)]
            WSClient[WebSocket Client (To XiaoZhi)]
        end

        subgraph "Core Logic (核心逻辑)"
            ServiceRegistry[Service Registry\n(服务注册中心)]
            ToolAggregator[Tool Aggregator\n(工具聚合器)]
            ConfigManager[Config Manager\n(配置管理)]
        end

        subgraph "Adapter Layer (适配器层)"
            StdioAdapter[Stdio Adapter]
            SSEAdapter[SSE Adapter]
            HTTPAdapter[HTTP Adapter]
        end
    end

    subgraph "MCP Services (工具服务)"
        FS[FileSystem Service]
        Fetch[Fetch Service]
        GitHub[GitHub Service]
        Memory[Memory Service]
        Other[Other MCP Servers...]
    end

    %% Client Interactions
    WebUI -->|REST API| APIServer
    Trae -->|SSE Connection| SSEEndpoint
    WSClient <-->|WebSocket| XiaoZhi

    %% Core Interactions
    APIServer --> ConfigManager
    APIServer --> ServiceRegistry
    SSEEndpoint --> ToolAggregator
    WSClient --> ToolAggregator

    %% Aggregation Logic
    ToolAggregator --> ServiceRegistry
    ServiceRegistry --> StdioAdapter
    ServiceRegistry --> SSEAdapter
    ServiceRegistry --> HTTPAdapter

    %% Service Connections
    StdioAdapter -->|Spawn Process| FS
    StdioAdapter -->|Spawn Process| Fetch
    SSEAdapter -->|HTTP/SSE| GitHub
    HTTPAdapter -->|HTTP POST| Memory
```

### 核心组件说明

1.  **Service Registry (服务注册中心)**
    - 管理所有已配置的 MCP 服务实例。
    - 负责服务的生命周期管理（启动、停止、重启）。
    - 维护服务状态（Connected, Disconnected, Error）。

2.  **Tool Aggregator (工具聚合器)**
    - 从 Service Registry 获取所有活跃服务。
    - 聚合所有服务提供的工具（Tools）、资源（Resources）和提示词（Prompts）。
    - 为客户端提供统一的工具调用入口，并负责请求路由分发。
    - **指纹机制**: 通过计算工具列表指纹（Fingerprint）高效检测工具变更，减少不必要的通知。

3.  **Connection Modules (连接模块)**
    - **XiaoZhiConnection**: 
      - 作为 WebSocket **客户端** 主动连接到小智服务端。
      - 负责握手、鉴权、心跳保活。
      - 将聚合后的工具注册给小智，并处理小智发起的工具调用请求。
    - **McpProxy (SSE Endpoint)**:
      - 作为 SSE **服务端** 暴露给 Trae/VSCode 等标准 MCP 客户端。
      - 遵循 MCP 协议标准，提供 `/sse` 和 `/messages` 端点。
      - 支持动态工具列表更新通知。

4.  **Config Manager (配置管理)**
    - 管理 `web-config.json`。
    - 处理服务配置、小智端点配置、用户偏好设置。
    - 支持配置热重载。

## 📦 Monorepo 结构

项目采用 Bun Workspaces 管理多个包：

```text
mcp-gateway/
├── packages/
│   ├── shared/              # [通用] 共享类型定义、工具函数、常量
│   │   └── src/types/       # MCP 协议类型扩展、API 接口定义
│   │
│   ├── core/                # [核心] 业务逻辑层
│   │   └── src/
│   │       ├── adapters/    # MCP 服务适配器 (Stdio, SSE, HTTP)
│   │       ├── core/        # 核心类 (McpAgent, ServiceRegistry, ToolAggregator)
│   │       ├── config/      # 配置管理 (WebConfigManager)
│   │       └── utils/       # 日志、验证器等
│   │
│   ├── server/              # [后端] HTTP API 服务器
│   │   └── src/
│   │       ├── routes/      # REST API 路由 (Hono)
│   │       └── index.ts     # 服务入口
│   │
│   ├── web/                 # [前端] Web 管理界面
│   │   └── src/
│   │       ├── pages/       # 页面 (Dashboard, Services, Connection)
│   │       ├── components/  # UI 组件 (Shadcn/ui)
│   │       └── api/         # 后端 API 客户端
│   │
│   ├── cli/                 # [工具] 命令行接口
│   │   └── src/cli.ts       # mcp-gateway CLI 入口
│   │
│   └── desktop/             # [桌面] Electron 桌面应用 (规划中)
│
├── config/                  # 运行时配置目录
│   └── web-config.json      # 用户配置文件 (自动生成)
│
├── docker-compose.yml       # 容器编排配置
└── Dockerfile               # 多阶段构建 Dockerfile
```

## 🔌 数据流向

### 1. 小智 (XiaoZhi) 调用工具流程
1.  **连接建立**: Gateway 启动 `XiaoZhiConnection`，连接到配置的 WebSocket 端点。
2.  **工具注册**: Gateway 通过 `ToolAggregator` 获取所有工具，发送 `tools/list` 给小智。
3.  **调用请求**: 小智发送 `tools/call` 请求 (JSON-RPC)。
4.  **路由分发**: `XiaoZhiConnection` 接收请求 -> `ToolAggregator` 解析工具所属服务 -> `ServiceRegistry` 找到对应适配器。
5.  **执行**: 适配器 (如 StdioAdapter) 将请求转发给底层 MCP Service (如 FileSystem)。
6.  **结果返回**: MCP Service 返回结果 -> 适配器 -> Aggregator -> Connection -> 小智。

### 2. Trae/VSCode 调用工具流程
1.  **连接建立**: Trae 连接到 Gateway 的 SSE 端点 (`http://localhost:3000/sse`)。
2.  **工具发现**: Trae 发送 `initialize` 和 `tools/list` 请求。
3.  **聚合响应**: Gateway 返回所有聚合后的工具列表。
4.  **动态更新**: 当用户在 Web UI 添加新服务时，Gateway 通过 SSE 发送 `notifications/tools/list_changed`，触发 Trae 刷新工具列表。

## 🔒 安全设计

- **Web UI 认证**: 基于 JWT / Cookie 的登录认证机制（可选开启）。
- **Token 管理**: 小智连接使用 Bearer Token 认证。
- **环境隔离**: Docker 容器化部署，限制文件系统访问权限（通过 Volume 挂载控制）。

## 🔧 扩展性设计

- **适配器模式**: 易于扩展新的 MCP 服务连接方式（如未来支持 TCP、gRPC）。
- **插件市场**: 通过标准化的元数据定义，支持接入第三方 MCP 插件生态。
- **多平台构建**: 支持 AMD64 和 ARM64，适配多种部署环境。
