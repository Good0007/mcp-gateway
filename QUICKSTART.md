# 快速开始指南

## 1. 安装依赖

```bash
bun install
```

## 2. 启动服务

```bash
# 开发模式（推荐）
bun run dev

# 生产模式
bun run build && bun run start
```

访问 `http://localhost:5174` 打开 Web 管理界面。

## 3. 配置服务

### 通过 Web 界面

1. 打开 http://localhost:5174
2. 点击"服务管理"页面
3. 添加新服务或编辑现有配置
4. 支持导入 Claude Desktop/VS Code MCP 配置

### 通过配置文件

编辑 `config/web-config.json`：

```json
{
  "xiaozhi": {
    "endpoint": "wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN"
  },
  "services": [
    {
      "id": "memory",
      "type": "stdio",
      "name": "Memory",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {}
    }
  ]
}
```

## 4. 环境检测

在 Web 界面的"环境检测"页面，检查并安装必要的开发环境：
- Node.js 和 npm（必需）
- Python、Rust、Java、Go（可选）

一键安装功能支持 macOS、Linux、Windows。

## 常见问题

**Q: 如何安装特定的 MCP 服务？**  
A: 在服务管理页面添加新服务，填入对应的命令或 URL。

**Q: 如何在不同操作系统上安装环境？**  
A: 打开环境检测页面，查看对应系统的推荐安装命令，点击安装按钮即可。

**Q: 配置修改后需要重启吗？**  
A: 不需要，配置自动热重载。

## 更多资源

- [README.md](./README.md) - 完整项目说明
- [docs/](./docs/) - 详细技术文档
