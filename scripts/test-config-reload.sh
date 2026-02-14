#!/bin/bash
# 测试配置热重载自动重连功能

echo "🧪 测试配置重载自动重连"
echo "================================"
echo ""

# 检查服务是否运行
echo "1️⃣  检查服务状态..."
if ps aux | grep -E "(tsx.*cli|mcp-agent)" | grep -v grep > /dev/null; then
    echo "✅ MCP Agent 正在运行"
else
    echo "❌ MCP Agent 未运行，请先启动: bun run start:dev"
    exit 1
fi
echo ""

# 查看当前工具数
echo "2️⃣  查看当前工具列表..."
TOOL_COUNT=$(tail -100 logs/mcp-agent.log | grep "toolCount" | tail -1 | grep -o '"toolCount":[0-9]*' | cut -d: -f2)
echo "   当前工具数: $TOOL_COUNT"
echo ""

echo "3️⃣  测试步骤："
echo "   a) 编辑配置文件 config/agent-config.json"
echo "   b) 启用或禁用一个服务 (例如：memory-npx)"
echo "   c) 保存文件"
echo "   d) 观察日志输出"
echo ""

echo "4️⃣  观察日志 (Ctrl+C 退出):"
echo "   tail -f logs/mcp-agent.log | grep -E '(Configuration changed|Reconnecting|toolCount)'"
echo ""

echo "期望的日志输出："
echo "   ✅ Configuration changed, reconnecting to xiaozhi to refresh tools"
echo "   ✅ Reconnecting to xiaozhi to refresh tool list"
echo "   ✅ Disconnected from xiaozhi"
echo "   ✅ Connecting to xiaozhi"
echo "   ✅ Responding with tools {toolCount: XX}"
echo "   ✅ Reconnection complete, xiaozhi will re-fetch tools"
echo ""

# 实时监控日志
echo "开始实时监控（10秒后自动修改配置）..."
sleep 2

# 后台监控日志
tail -f logs/mcp-agent.log | grep --line-buffered -E '(Configuration|Reconnecting|toolCount|Responding)' &
TAIL_PID=$!

sleep 10

# 自动切换 memory-npx 状态
echo ""
echo "🔄 自动切换 memory-npx 服务状态..."

if grep -q '"id": "memory-npx".*"enabled": true' config/agent-config.json; then
    echo "   禁用 memory-npx..."
    sed -i.bak 's/"id": "memory-npx",.*"enabled": true/"id": "memory-npx", "enabled": false/' config/agent-config.json
else
    echo "   启用 memory-npx..."
    sed -i.bak 's/"id": "memory-npx",.*"enabled": false/"id": "memory-npx", "enabled": true/' config/agent-config.json
fi

echo "   配置已更改，观察日志..."
sleep 5

# 结束监控
kill $TAIL_PID 2>/dev/null

echo ""
echo "================================"
echo "✅ 测试完成！"
echo ""
echo "如需手动测试："
echo "  1. 编辑 config/agent-config.json"
echo "  2. 修改任意服务的 enabled 状态"
echo "  3. 保存文件"
echo "  4. 查看日志: tail -f logs/mcp-agent.log"
echo "  5. 在 xiaozhi 界面查看工具列表是否更新"
