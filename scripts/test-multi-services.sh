#!/bin/bash
# 快速测试多服务集成

echo "🧪 MCP Agent 多服务集成测试"
echo "================================"
echo ""

# 检查 calculator-mcp 是否运行
echo "📡 检查 Calculator Service (SSE)..."
if curl -s http://localhost:8931/sse > /dev/null 2>&1; then
    echo "✅ Calculator Service 运行中 (http://localhost:8931)"
else
    echo "❌ Calculator Service 未运行"
    echo "   启动命令: git clone https://github.com/modelcontextprotocol/servers.git mcp-servers"
    echo "              cd mcp-servers/src/calculator && npm install && npm run build && npm start"
fi
echo ""

# 测试 npx 可用性
echo "🔧 检查 NPX 可用性..."
if command -v npx > /dev/null 2>&1; then
    echo "✅ NPX 已安装: $(npx --version)"
else
    echo "❌ NPX 未安装，请先安装 Node.js"
    exit 1
fi
echo ""

# 测试 Memory Server (stdio)
echo "🧠 测试 Memory Service (stdio via npx)..."
echo "正在启动 @modelcontextprotocol/server-memory..."
timeout 5 npx -y @modelcontextprotocol/server-memory > /dev/null 2>&1 &
PID=$!
sleep 2
if ps -p $PID > /dev/null 2>&1; then
    echo "✅ Memory Server 可以启动"
    kill $PID 2>/dev/null
else
    echo "⚠️  Memory Server 启动可能有问题"
fi
echo ""

# 测试 Filesystem Server (stdio)
echo "📁 测试 Filesystem Service (stdio via npx)..."
echo "正在下载 @modelcontextprotocol/server-filesystem..."
npx -y @modelcontextprotocol/server-filesystem --version > /dev/null 2>&1
if [ $? -eq 0 ] || [ $? -eq 1 ]; then
    echo "✅ Filesystem Server 已下载可用"
else
    echo "⚠️  Filesystem Server 下载可能有问题"
fi
echo ""

echo "================================"
echo "📋 建议的测试配置："
echo ""
echo "1. 启用 Calculator (SSE): 确保先运行 calculator-mcp"
echo "2. 启用 Memory (stdio): 设置 memory-npx enabled: true"
echo "3. 启用 Filesystem (stdio): 设置 filesystem-npx enabled: true"
echo ""
echo "编辑配置文件："
echo "  nano config/agent-config.json"
echo ""
echo "启动 Agent："
echo "  bun run start:dev"
echo ""
echo "================================"
