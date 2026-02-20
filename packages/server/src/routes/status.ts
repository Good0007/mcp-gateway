/**
 * Status API Routes
 * GET /api/status - Get agent status
 */

import { Hono } from 'hono';
import { getAgent, hasAgent } from '../agent.js';
import type { AgentStatusResponse } from '@mcp-agent/shared';

const app = new Hono();

app.get('/', async (c) => {
  try {
    if (!hasAgent()) {
      return c.json<AgentStatusResponse>({
        running: false,
        connected: false,
        xiaozhi: {
          connected: false,
          endpoint: '',
        },
        services: {
          total: 0,
          running: 0,
          stopped: 0,
          error: 0,
        },
        uptime: 0,
      });
    }

    const agent = await getAgent();
    const status = agent.getStatus();
    const registry = agent.getRegistry();
    const webConfigManager = agent.getWebConfigManager();
    const endpoint = webConfigManager.getCurrentEndpoint();
    const stats = registry.getStats();

    const response: AgentStatusResponse = {
      running: status.running,
      connected: status.connected,
      xiaozhi: {
        connected: status.connected,
        endpoint: endpoint?.url || '',
      },
      services: {
        total: stats.total,
        running: stats.running,
        stopped: stats.stopped,
        error: stats.error,
      },
      uptime: status.running ? process.uptime() : 0,
    };

    return c.json(response);
  } catch (error) {
    console.error('Status route error:', error);
    return c.json({ error: 'Failed to get status' }, 500);
  }
});

// POST /api/status/reconnect - Force reconnection to Xiaozhi
app.post('/reconnect', async (c) => {
  try {
    if (!hasAgent()) {
      return c.json({ error: 'Agent not initialized' }, 500);
    }

    const agent = await getAgent();
    await agent.reconnect();

    return c.json({ success: true, message: 'Reconnection triggered' });
  } catch (error: any) {
    console.error('Reconnect route error:', error);
    return c.json({ error: error.message || 'Failed to reconnect' }, 500);
  }
});

export default app;
