# MCP 服务配置导入指南

## 功能概述

WebUI 现在支持两种方式配置 MCP 服务：

1. **手动添加服务** - 逐个填写服务配置信息
2. **导入 MCP 配置** - 从 Claude Desktop 或 VS Code 的配置文件批量导入

## 环境变量支持

### 在 Stdio 服务中使用环境变量

添加或编辑 Stdio 类型服务时，现在可以配置环境变量（JSON 格式）：

```json
{
  "REDIS_HOST": "localhost",
  "REDIS_PORT": "6379",
  "REDIS_PASSWORD": "your-password",
  "MCP_REDIS_LOG_LEVEL": "INFO"
}
```

**使用场景：**
- API Keys（如 GitHub Token、OpenAI Key）
- 数据库连接信息（主机、端口、密码）
- 服务配置（日志级别、超时时间）

## 导入 MCP 配置

### 支持的格式

#### 1. Claude Desktop 格式

```json
{
  "mcpServers": {
    "redis": {
      "command": "uvx",
      "args": ["--from", "redis-mcp-server@latest", "redis-mcp-server", "--url", "redis://localhost:6379/0"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "MCP_REDIS_LOG_LEVEL": "INFO"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

#### 2. VS Code 格式

```json
{
  "servers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username"]
    }
  }
}
```

### 导入步骤

1. **打开服务管理页面**
2. **点击"导入配置"按钮**（在"添加服务"按钮旁边）
3. **粘贴配置 JSON**
   - 从 `~/.config/claude/claude_desktop_config.json` 复制
   - 或从 `.vscode/mcp.json` 复制
4. **点击"解析配置"**
   - 系统会自动识别配置格式
   - 显示将要导入的服务列表预览
5. **确认导入**
   - 点击"确认导入 N 个服务"
   - 系统逐个添加服务
   - 显示导入结果（成功/失败数量）

### 自动识别

导入功能会自动识别以下信息：

**服务类型：**
- Stdio 服务：有 `command` 字段
- SSE 服务：args 中包含 HTTP URL

**服务名称和描述：**
- 根据服务 ID 和包名自动推断
- 支持常见服务：filesystem、memory、github、redis、postgres、puppeteer、slack、weather、calculator

**示例：**

| ID | 识别为 |
|----|--------|
| `redis` | Redis Service - Redis key-value store operations |
| `github` | GitHub Service - GitHub API integration |
| `memory` | Memory Service - Knowledge graph memory |

### 常见配置示例

#### Redis (uvx)

```json
{
  "mcpServers": {
    "redis": {
      "command": "uvx",
      "args": ["--from", "redis-mcp-server@latest", "redis-mcp-server"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379"
      }
    }
  }
}
```

#### PostgreSQL (npx)

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:pass@localhost/db"
      }
    }
  }
}
```

#### GitHub (npx)

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

#### Weather (npx)

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-weather"],
      "env": {
        "WEATHER_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 注意事项

1. **导入的服务默认为禁用状态**
   - 需要手动启动服务
   - 避免自动启动大量服务占用资源

2. **ID 冲突**
   - 如果服务 ID 已存在，导入会失败
   - 建议先检查现有服务列表

3. **环境变量安全**
   - 敏感信息（API Token、密码）会明文存储在配置文件
   - 建议使用环境变量或密钥管理系统

4. **命令可用性**
   - 确保 `npx`、`uvx` 等命令已安装
   - 首次运行会自动下载包（可能较慢）

## 命令工具说明

### npx (Node.js)
- **安装：** 安装 Node.js 时自动包含
- **用途：** 执行 npm 包命令
- **特点：** 自动下载和缓存

### uvx (Python)
- **安装：** `pip install uv` 或 `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **用途：** 执行 Python 包命令
- **特点：** 速度更快（Rust 实现），类似 npx

## 故障排除

### 导入失败

**问题：** "JSON 解析错误"
- **解决：** 检查 JSON 格式是否正确，使用 JSON 验证工具

**问题：** "配置中没有找到有效的服务定义"
- **解决：** 确认配置包含 `mcpServers` 或 `servers` 字段

### 服务启动失败

**问题：** "命令未找到: uvx"
- **解决：** 安装 uv: `pip install uv`

**问题：** "权限被拒绝"
- **解决：** 检查命令是否有执行权限

## 完整示例

从 Claude Desktop 配置导入多个服务：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    },
    "redis": {
      "command": "uvx",
      "args": ["--from", "redis-mcp-server@latest", "redis-mcp-server"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379"
      }
    }
  }
}
```

导入后将创建 4 个服务，所有服务默认禁用，需要手动启动。
