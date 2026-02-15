/**
 * Services API Routes
 * Manage MCP services
 */

import { Hono } from 'hono';
import { getAgent } from '../agent.js';
import type { ServiceListResponse, ServiceDetailResponse } from '@mcp-agent/shared';

const app = new Hono();

// GET /api/services - List all services
app.get('/', async (c) => {
  try {
    const agent = await getAgent();
    const registry = agent.getRegistry();
    const services = registry.getAllMetadata();

    const response: ServiceListResponse = {
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
        serverInfo: s.serverInfo,
        capabilities: s.capabilities,
        error: s.error,
      })),
    };

    return c.json(response);
  } catch (error) {
    console.error('Services list error:', error);
    return c.json({ error: 'Failed to list services' }, 500);
  }
});

// GET /api/services/:id - Get service detail
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const agent = await getAgent();
    const registry = agent.getRegistry();
    const config = agent.getConfig();

    const service = registry.getMetadata(id);
    if (!service) {
      return c.json({ error: 'Service not found' }, 404);
    }

    const serviceConfig = config.services.find((s) => s.id === id);
    if (!serviceConfig) {
      return c.json({ error: 'Service config not found' }, 404);
    }

    const response: ServiceDetailResponse = {
      id: service.id,
      name: service.name,
      description: service.description,
      status: service.status,
      serverInfo: service.serverInfo,
      capabilities: service.capabilities,
      error: service.error,
      config: serviceConfig,
      tools: [],
    };

    return c.json(response);
  } catch (error) {
    console.error('Service detail error:', error);
    return c.json({ error: 'Failed to get service detail' }, 500);
  }
});

// POST /api/services/:id/start - Start a service
app.post('/:id/start', async (c) => {
  try {
    const id = c.req.param('id');
    const agent = await getAgent();
    const registry = agent.getRegistry();

    await registry.start(id);

    return c.json({ success: true, message: `Service ${id} started` });
  } catch (error: any) {
    console.error('Service start error:', error);
    return c.json({ error: error.message || 'Failed to start service' }, 500);
  }
});

// POST /api/services/:id/stop - Stop a service
app.post('/:id/stop', async (c) => {
  try {
    const id = c.req.param('id');
    const agent = await getAgent();
    const registry = agent.getRegistry();

    await registry.stop(id);

    return c.json({ success: true, message: `Service ${id} stopped` });
  } catch (error: any) {
    console.error('Service stop error:', error);
    return c.json({ error: error.message || 'Failed to stop service' }, 500);
  }
});

export default app;
