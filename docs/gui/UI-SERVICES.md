# 服务配置页面设计

## 页面布局

```
┌────────────────────────────────────────────────┐
│  [+ 添加服务]              [导入] [导出]      │
├────────────────────────────────────────────────┤
│  🟢 运行中 (2)  🔴 已停止 (1)  ⚠️ 错误 (0)   │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐ │
│  │ 🧮 Calculator Service          🟢 运行中 │ │
│  │ Type: SSE                                │ │
│  │ URL: http://localhost:8931/sse           │ │
│  │ Tools: 6 (add, sub, mul, div, sqrt, mod) │ │
│  │ [停止] [编辑] [删除] [查看日志] [...]   │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │ 🗄️ Filesystem Service         🟢 运行中 │ │
│  │ Type: Stdio (NPX)                        │ │
│  │ Command: npx @modelcontextprotocol/...  │ │
│  │ Tools: 14 (read_file, write_file, ...)  │ │
│  │ [停止] [编辑] [删除] [查看日志] [...]   │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │ 💬 Slack Service               🔴 已停止 │ │
│  │ Type: HTTP                               │ │
│  │ BaseURL: https://slack.com/api/          │ │
│  │ Tools: 0 (未运行)                        │ │
│  │ [启动] [编辑] [删除] [查看日志] [...]   │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

## 添加服务表单

```
┌─────────────────────────────────────┐
│  添加新服务                     [✕] │
├─────────────────────────────────────┤
│  基本信息                           │
│  ┌───────────────────────────────┐ │
│  │ 服务名称: [Calculator        ]│ │
│  │ 描述: [数学计算服务          ]│ │
│  └───────────────────────────────┘ │
│                                     │
│  连接类型 *                         │
│  ○ Stdio (NPX)  ○ SSE              │
│  ○ HTTP         ○ Embedded         │
│                                     │
│  ┌─ Stdio 配置 ──────────────────┐ │
│  │ Command: [npx               ] │ │
│  │ Args:    [-y                ] │ │
│  │          [@model...-calc    ] │ │
│  │          [+ 添加参数         ] │ │
│  │                               │ │
│  │ 环境变量 (可选)                │ │
│  │ KEY         VALUE             │ │
│  │ [API_KEY  ] [***********  ]  │ │
│  │ [+ 添加变量]                  │ │
│  │                               │ │
│  │ 工作目录: [/Users/kangkang  ] │ │
│  └───────────────────────────────┘ │
│                                     │
│  高级选项                           │
│  ☑ 自动启动                         │
│  ☐ 启用健康检查                     │
│                                     │
│  [测试连接]     [保存]  [取消]     │
└─────────────────────────────────────┘
```

## 服务卡片组件

```tsx
interface ServiceCard {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http' | 'embedded';
  status: 'running' | 'stopped' | 'error';
  config: ServiceConfig;
  tools: string[];
  uptime?: number;
  errorMessage?: string;
}
```

### 状态指示

```
🟢 运行中    - 正常运行
🔴 已停止    - 手动停止
⚠️ 错误      - 启动失败/运行异常
🟡 启动中    - 正在启动
```

## 编辑服务表单

```
┌─────────────────────────────────────┐
│  编辑服务: Calculator           [✕] │
├─────────────────────────────────────┤
│  [基本信息] [配置] [环境变量] [日志]│
├─────────────────────────────────────┤
│  服务名称: [Calculator            ]│
│  描述: [数学计算服务              ]│
│  启用: [✓]                          │
│                                     │
│  连接类型: SSE                      │
│  URL: [http://localhost:8931/sse  ]│
│                                     │
│  超时时间(ms): [30000]              │
│  重试次数: [3]                      │
│                                     │
│  请求头 (可选)                      │
│  KEY              VALUE             │
│  [Authorization] [Bearer xxx    ]  │
│  [+ 添加请求头]                     │
│                                     │
│  [测试连接]     [保存]  [取消]     │
└─────────────────────────────────────┘
```

## 批量操作

```
┌────────────────────────────────────┐
│ ☑ 已选择 2 个服务                  │
│                                    │
│ [启动全部] [停止全部] [删除]      │
└────────────────────────────────────┘
```

## 导入/导出

### 导出配置
```json
{
  "version": "1.0",
  "services": [
    {
      "id": "calculator",
      "type": "sse",
      "name": "Calculator",
      "enabled": true,
      "url": "http://localhost:8931/sse"
    }
  ]
}
```

### 导入流程
1. 点击"导入"按钮
2. 选择 JSON 文件
3. 预览配置
4. 确认导入
5. 合并/覆盖选择

## 配置模板

```
┌─────────────────────────────────────┐
│  选择配置模板                   [✕] │
├─────────────────────────────────────┤
│  🧮 Calculator (SSE)                │
│  🗄️ Filesystem (Stdio)              │
│  🧠 Memory (Stdio)                  │
│  🔍 Brave Search (Stdio)            │
│  💬 Slack (HTTP)                    │
│  ☁️ AWS (Python)                    │
│  📧 Gmail (OAuth)                   │
│  ⚙️ 自定义...                       │
└─────────────────────────────────────┘
```

## 验证规则

```typescript
interface ValidationRules {
  stdio: {
    command: { required: true },
    args: { required: false, type: 'array' },
    cwd: { required: false, type: 'string' },
  };
  sse: {
    url: { required: true, pattern: /^https?:\/\// },
  };
  http: {
    baseUrl: { required: true, pattern: /^https?:\/\// },
    timeout: { min: 1000, max: 300000 },
  };
  embedded: {
    modulePath: { required: true, exists: true },
  };
}
```

## 服务状态 API

```typescript
// 获取服务列表
GET /api/services

// 创建服务
POST /api/services
{
  "type": "sse",
  "name": "Calculator",
  "url": "http://localhost:8931/sse"
}

// 更新服务
PUT /api/services/:id

// 删除服务
DELETE /api/services/:id

// 启动/停止服务
POST /api/services/:id/start
POST /api/services/:id/stop

// 测试连接
POST /api/services/:id/test

// 获取服务日志
GET /api/services/:id/logs
```

## 快捷操作

```
右键菜单:
├─ 启动服务
├─ 停止服务
├─ 重启服务
├─ 编辑配置
├─ 复制配置
├─ 查看日志
├─ 测试连接
└─ 删除服务
```
