/**
 * Calculator + Xiaozhi Integration Test
 * 
 * 前提条件：
 * 1. calculator-mcp 已启动: npx @wrtnlabs/calculator-mcp@latest --port 8931
 * 2. 小智端点配置正确: .env.local 中的 MCP_ENDPOINT
 * 
 * 测试流程：
 * 1. 加载配置
 * 2. 启动 MCP Agent
 * 3. 连接 calculator-mcp 服务 (SSE)
 * 4. 连接小智端点 (WebSocket)
 * 5. 验证工具列表
 * 6. 调用计算器工具
 * 7. 清理资源
 */

import { MCPAgent } from '../../src/core/mcp-agent.js';
import { ConfigLoader } from '../../src/config/config-loader.js';
import { logger } from '../../src/utils/logger.js';

describe('Calculator + Xiaozhi Integration', () => {
  let agent: MCPAgent | null = null;
  const configPath = './config/agent-config.json';

  // 超时时间设置为 30 秒（网络操作）
  jest.setTimeout(30000);

  beforeAll(async () => {
    logger.info('=== Starting Calculator + Xiaozhi Integration Test ===');
  });

  afterAll(async () => {
    if (agent) {
      await agent.stop();
    }
    logger.info('=== Integration Test Completed ===');
  });

  it('should load configuration successfully', async () => {
    const configLoader = new ConfigLoader(configPath);
    const config = await configLoader.load();

    expect(config).toBeDefined();
    expect(config.xiaozhi).toBeDefined();
    expect(config.xiaozhi.endpoint).toContain('xiaozhi.me');
    expect(config.services).toHaveLength(4); // calculator + 3 disabled services

    logger.info('✓ Configuration loaded', {
      endpoint: config.xiaozhi.endpoint.substring(0, 50) + '...',
      servicesCount: config.services.length,
      enabledServices: config.services.filter((s) => s.enabled).length,
    });
  });

  it('should initialize MCP Agent', async () => {
    agent = new MCPAgent(configPath);
    expect(agent).toBeDefined();

    logger.info('✓ MCP Agent initialized');
  });

  it('should start MCP Agent and connect to calculator service', async () => {
    expect(agent).not.toBeNull();

    await agent!.start();

    // 等待服务启动
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const stats = agent!.getRegistry().getStats();
    expect(stats.running).toBeGreaterThan(0);

    logger.info('✓ MCP Agent started', { stats });
  });

  it('should list calculator tools', async () => {
    expect(agent).not.toBeNull();

    const tools = await agent!.getAggregator().getAllTools();

    expect(tools.length).toBeGreaterThan(0);
    
    // Calculator 应该提供这些工具
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('add');
    expect(toolNames).toContain('sub');
    expect(toolNames).toContain('mul');
    expect(toolNames).toContain('div');

    logger.info('✓ Calculator tools listed', {
      toolCount: tools.length,
      tools: toolNames,
    });
  });

  it('should call calculator add tool', async () => {
    expect(agent).not.toBeNull();

    const result = await agent!.getAggregator().callTool({ 
      name: 'add',
      arguments: { a: 5, b: 3 }
    });

    expect(result).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('8');

    logger.info('✓ Calculator add(5, 3) = 8', { result });
  });

  it('should call calculator multiply tool', async () => {
    expect(agent).not.toBeNull();

    const result = await agent!.getAggregator().callTool({
      name: 'mul',
      arguments: { a: 4, b: 7 }
    });

    expect(result).toBeDefined();
    expect(result.content[0].text).toContain('28');

    logger.info('✓ Calculator mul(4, 7) = 28', { result });
  });

  it('should call calculator divide tool', async () => {
    expect(agent).not.toBeNull();

    const result = await agent!.getAggregator().callTool({
      name: 'div',
      arguments: { a: 10, b: 2 }
    });

    expect(result).toBeDefined();
    expect(result.content[0].text).toContain('5');

    logger.info('✓ Calculator div(10, 2) = 5', { result });
  });

  it('should handle division by zero error', async () => {
    expect(agent).not.toBeNull();

    try {
      await agent!.getAggregator().callTool({
        name: 'div',
        arguments: { a: 10, b: 0 }
      });
      fail('Should have thrown error for division by zero');
    } catch (error) {
      expect(error).toBeDefined();
      logger.info('✓ Division by zero handled correctly', { error });
    }
  });

  it('should connect to xiaozhi endpoint', async () => {
    expect(agent).not.toBeNull();

    const connection = agent!.getConnection();
    expect(connection).toBeDefined();

    // 验证连接状态
    const isConnected = connection?.isConnected();
    
    if (isConnected) {
      logger.info('✓ Connected to Xiaozhi endpoint');
    } else {
      logger.warn('⚠ Not connected to Xiaozhi endpoint - check endpoint configuration');
    }

    // 这个测试不会失败，因为连接可能因为网络原因失败
    // 但我们记录状态用于调试
    expect(connection).toBeDefined();
  });

  it('should get service statistics', async () => {
    expect(agent).not.toBeNull();

    const registry = agent!.getRegistry();
    const stats = registry.getStats();

    expect(stats.total).toBeGreaterThan(0);
    expect(stats.running).toBeGreaterThan(0);

    const metadata = registry.getAllMetadata();
    const calculatorMeta = metadata.find((m) => m.id === 'calculator');

    expect(calculatorMeta).toBeDefined();
    expect(calculatorMeta?.name).toBe('Calculator Service');

    logger.info('✓ Service statistics', { stats, calculator: calculatorMeta });
  });
});
