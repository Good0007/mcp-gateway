/**
 * Tools API Routes
 * List and execute tools
 */

import { Hono } from 'hono';
import { getAgent } from '../agent.js';
import type { ToolListResponse, ToolCallRequestBody, ToolCallResponse } from '@mcp-agent/shared';

const app = new Hono();

// GET /api/tools - List all tools from all services
app.get('/', async (c) => {
  try {
    const agent = await getAgent();
    const aggregator = agent.getAggregator();
    const tools = await aggregator.getAllTools();

    const response: ToolListResponse = {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        serviceId: tool.serviceId,
        serviceName: tool.serviceName,
      })),
    };

    return c.json(response);
  } catch (error) {
    console.error('Tools list error:', error);
    return c.json({ error: 'Failed to list tools' }, 500);
  }
});

// POST /api/tools/call - Call a tool
app.post('/call', async (c) => {
  try {
    const body = await c.req.json<ToolCallRequestBody>();
    const agent = await getAgent();
    const aggregator = agent.getAggregator();

    const startTime = Date.now();
    const result = await aggregator.callTool(body.tool);
    const executionTime = Date.now() - startTime;

    // Get service ID from tool name
    const tools = await aggregator.getAllTools();
    const toolInfo = tools.find((t) => t.name === body.tool.name);

    const response: ToolCallResponse = {
      result,
      executionTime,
      serviceId: toolInfo?.serviceId || 'unknown',
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Tool call error:', error);
    return c.json({ error: error.message || 'Failed to call tool' }, 500);
  }
});

export default app;
