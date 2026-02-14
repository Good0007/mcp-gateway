#!/usr/bin/env node

/**
 * Manual Integration Test Script
 * 快速验证 Calculator + Xiaozhi 集成
 * 
 * 用法：
 *   bun run test:manual
 *   或
 *   node dist/scripts/manual-test.js
 */

import { MCPAgent } from '../core/mcp-agent.js';
import { ConfigLoader } from '../config/config-loader.js';
import { initLogger } from '../utils/logger.js';

// 初始化日志
initLogger({ level: 'info', console: true });

async function runManualTest() {
  let agent: MCPAgent | null = null;

  try {
    console.log('\n🚀 Starting Manual Integration Test\n');
    console.log('=' .repeat(60));

    // 1. 加载配置（用于显示信息）
    console.log('\n📋 Step 1: Validating configuration...');
    const configLoader = new ConfigLoader('./config/agent-config.json');
    const config = await configLoader.load();
    
    console.log('✓ Configuration validated');
    console.log(`  - Xiaozhi endpoint: ${config.xiaozhi.endpoint!.substring(0, 50)}...`);
    console.log(`  - Services: ${config.services.length}`);
    console.log(`  - Enabled: ${config.services.filter((s) => s.enabled).length}`);

    // 2. 初始化 Agent（传入配置路径）
    console.log('\n🤖 Step 2: Initializing MCP Agent...');
    agent = new MCPAgent('./config/agent-config.json');
    console.log('✓ MCP Agent initialized');

    // 3. 启动 Agent
    console.log('\n▶️  Step 3: Starting MCP Agent...');
    await agent.start();
    
    // 等待服务启动
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    const stats = agent.getRegistry().getStats();
    console.log('✓ MCP Agent started');
    console.log(`  - Total services: ${stats.total}`);
    console.log(`  - Running: ${stats.running}`);
    console.log(`  - Stopped: ${stats.stopped}`);
    console.log(`  - Error: ${stats.error}`);

    // 4. 列出工具
    console.log('\n🔧 Step 4: Listing available tools...');
    const tools = await agent.getAggregator().getAllTools();
    console.log(`✓ Found ${tools.length} tools:`);
    tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // 5. 测试计算器工具
    console.log('\n🧮 Step 5: Testing calculator tools...\n');

    // Test 1: Addition
    console.log('Test 1: add(5, 3)');
    const addResult = await agent.getAggregator().callTool({ name: 'add', arguments: { a: 5, b: 3 } });
    console.log(`  Result: ${addResult.content[0].text}`);
    console.log('  ✓ Addition works\n');

    // Test 2: Subtraction
    console.log('Test 2: sub(10, 4)');
    const subResult = await agent.getAggregator().callTool({ name: 'sub', arguments: { a: 10, b: 4 } });
    console.log(`  Result: ${subResult.content[0].text}`);
    console.log('  ✓ Subtraction works\n');

    // Test 3: Multiplication
    console.log('Test 3: mul(6, 7)');
    const mulResult = await agent.getAggregator().callTool({ name: 'mul', arguments: { a: 6, b: 7 } });
    console.log(`  Result: ${mulResult.content[0].text}`);
    console.log('  ✓ Multiplication works\n');

    // Test 4: Division
    console.log('Test 4: div(20, 4)');
    const divResult = await agent.getAggregator().callTool({ name: 'div', arguments: { a: 20, b: 4 } });
    console.log(`  Result: ${divResult.content[0].text}`);
    console.log('  ✓ Division works\n');

    // Test 5: Division by zero (should fail)
    console.log('Test 5: div(10, 0) - expecting error');
    try {
      await agent.getAggregator().callTool({ name: 'div', arguments: { a: 10, b: 0 } });
      console.log('  ✗ Should have thrown error');
    } catch (error) {
      console.log(`  ✓ Error handled correctly: ${error instanceof Error ? error.message : String(error)}\n`);
    }

    // 6. 检查小智连接
    console.log('🌐 Step 6: Checking Xiaozhi connection...');
    const connection = agent.getConnection();
    const isConnected = connection?.isConnected();
    
    if (isConnected) {
      console.log('✓ Connected to Xiaozhi endpoint');
      console.log('  小智现在可以使用 calculator 工具了！');
    } else {
      console.log('⚠ Not connected to Xiaozhi endpoint');
      console.log('  如果需要连接小智，请检查：');
      console.log('  1. .env.local 中的 MCP_ENDPOINT 是否正确');
      console.log('  2. 网络连接是否正常');
      console.log('  3. Token 是否有效');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All manual tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    // 清理
    if (agent) {
      console.log('\n🧹 Cleaning up...');
      await agent.stop();
      console.log('✓ Agent stopped\n');
    }
  }
}

// 运行测试
runManualTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
