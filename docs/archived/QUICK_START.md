# 快速入门指南

> 本指南将帮助您快速了解和使用MCP Agent

## 1. 概念介绍

### 什么是MCP Agent？

MCP Agent是一个代理服务，它可以：
- 连接到小智AI的WebSocket端点
- 管理多个MCP服务（Python、Node.js等）
- 将所有服务的工具聚合为统一接口
- 处理命名空间、过滤、大小限制等

### 核心概念

```
┌─────────────┐
│   小智 AI   │ ← 只需连接一次
└──────┬──────┘
       │
┌──────▼──────┐
│  MCP Agent  │ ← 统一管理
└──────┬──────┘
       │
   ┌───┴───┬───────┬─────────┐
   │       │       │         │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐  ┌──▼──┐
│计算器│ │文件 │ │浏览器│  │自定义│
│ MCP │ │ MCP │ │ MCP │  │ MCP │
└─────┘ └─────┘ └─────┘  └─────┘
```

## 2. 配置文件详解

### 基本结构

```json
{
  "xiaozhi": { },      // 小智连接配置
  "services": { },      // MCP服务配置
  "toolManager": { },   // 工具管理配置
  "logging": { }        // 日志配置
}
```

### 示例：添加一个Python计算器服务

```json
{
  "xiaozhi": {
    "endpoint": "${MCP_ENDPOINT}",
    "reconnect": {
      "initialBackoff": 1000,
      "maxBackoff": 60000
    }
  },
  "services": {
    "calculator": {
      "type": "stdio",
      "enabled": true,
      "command": "python",
      "args": ["-m", "calculator"],
      "namespace": "calc"
    }
  },
  "toolManager": {
    "maxToolListSize": 10240,
    "maxResultSize": 1024,
    "namespaceEnabled": true,
    "namespaceSeparator": ".",
    "whitelist": [],
    "blacklist": []
  },
  "logging": {
    "level": "info",
    "format": "%(timestamp)s - %(name)s - %(level)s - %(message)s"
  }
}
```

### 服务类型说明

#### 1. Stdio类型（适用于Python/独立进程）

```json
{
  "my-python-service": {
    "type": "stdio",
    "command": "python",
    "args": ["-m", "my_mcp_server"],
    "namespace": "mypy"
  }
}
```

#### 2. Embedded类型（适用于Node.js模块）

```json
{
  "filesystem": {
    "type": "embedded",
    "module": "@modelcontextprotocol/server-filesystem",
    "config": {
      "allowedDirectories": ["/workspace"]
    },
    "namespace": "fs"
  }
}
```

#### 3. SSE类型（适用于远程服务）

```json
{
  "remote-service": {
    "type": "sse",
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${API_KEY}"
    },
    "namespace": "remote"
  }
}
```

## 3. 使用场景

### 场景1：开发阶段测试

```bash
# 1. 创建测试配置
cp config/mcp-agent.config.json config/test.config.json

# 2. 只启用需要的服务
# 编辑test.config.json，设置其他服务enabled: false

# 3. 启动
MCP_AGENT_CONFIG=config/test.config.json npm start
```

### 场景2：生产环境部署

```bash
# 1. 设置环境变量
export MCP_ENDPOINT="wss://api.xiaozhi.me/mcp/?token=xxx"
export LOG_LEVEL="info"

# 2. 启动服务（推荐使用PM2）
pm2 start npm --name mcp-agent -- start

# 3. 查看日志
pm2 logs mcp-agent
```

### 场景3：配置热重载

1. 服务运行中，直接编辑配置文件
2. MCP Agent自动检测变化
3. 只重启变更的服务，其他服务不受影响

```bash
# 运行中
# 编辑 config/mcp-agent.config.json
# 添加新服务或修改配置
# 保存文件 → 自动生效！
```

## 4. 命名空间管理

### 为什么需要命名空间？

假设有两个服务都有`search`工具：
- 服务A：本地搜索
- 服务B：网络搜索

没有命名空间时，工具名冲突！

### 使用命名空间

```json
{
  "services": {
    "local-search": {
      "namespace": "local",
      // ...
    },
    "web-search": {
      "namespace": "web",
      // ...
    }
  }
}
```

工具名变为：
- `local.search` - 本地搜索
- `web.search` - 网络搜索

小智调用时使用完整名称。

## 5. 工具过滤

### 白名单模式

```json
{
  "toolManager": {
    "whitelist": ["calc.add", "calc.multiply", "fs.read_file"],
    "blacklist": []
  }
}
```

只暴露列表中的工具，其他隐藏。

### 黑名单模式

```json
{
  "toolManager": {
    "whitelist": [],
    "blacklist": ["dangerous.delete_all", "admin.reset"]
  }
}
```

隐藏列表中的工具，其他全部暴露。

## 6. 结果大小限制

### 小智限制

- 工具返回结果≤1024字节
- 超过限制会自动截断

### 示例

```python
# MCP服务返回
return {"result": "x" * 2000}  # 2000字节

# MCP Agent自动截断为1024字节
# 并记录警告日志
```

## 7. 健康检查

### 自动检查

Agent每30秒检查一次服务健康状态：

```json
{
  "healthCheck": {
    "interval": 30000,  // 30秒
    "timeout": 5000     // 超时5秒
  }
}
```

### 不健康时的行为

1. 标记服务为`error`状态
2. 不再路由工具调用到该服务
3. 尝试重启（可配置）
4. 记录错误日志

## 8. 故障排查

### 连接失败

```bash
# 检查端点是否正确
echo $MCP_ENDPOINT

# 检查网络连接
curl -I wss://api.xiaozhi.me/

# 查看日志
tail -f logs/mcp-agent.log
```

### 服务启动失败

```bash
# 手动测试服务
python -m calculator

# 检查路径和参数
which python
```

### 工具调用失败

1. 检查命名空间是否正确
2. 查看服务日志
3. 检查服务健康状态

## 9. 性能优化

### 优化1：使用Embedded模式

对于Node.js服务，优先使用embedded而非stdio：

```json
// 慢：stdio模式
{
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem"]
}

// 快：embedded模式
{
  "type": "embedded",
  "module": "@modelcontextprotocol/server-filesystem"
}
```

启动时间：3秒 → 0.1秒

### 优化2：启用工具列表缓存（未来版本）

```json
{
  "toolManager": {
    "cacheEnabled": true,
    "cacheTTL": 60000  // 1分钟
  }
}
```

## 10. 下一步

- 阅读[架构设计文档](ARCHITECTURE.md)
- 查看[技术规范](TECHNICAL_SPEC.md)
- 了解[实施计划](IMPLEMENTATION_PLAN.md)
- 参与开发或提出建议

---

**有问题？**
- 查看[故障排查文档](TROUBLESHOOTING.md)（即将完善）
- 提交[Issue](https://github.com/your-repo/issues)
