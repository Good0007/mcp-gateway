/**
 * Services API Routes
 * Manage MCP services
 */

import { Hono } from 'hono';
import { getAgent } from '../agent.js';
import type { ServiceListResponse, ServiceDetailResponse, ServiceConfig } from '@mcp-agent/shared';

/**
 * Extract full error message including cause chain
 */
function getFullErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  
  let message = error.message || String(error);
  
  // If there's a cause with more detailed message, include it
  if (error.cause && error.cause.message) {
    // The cause message is usually more detailed
    message = error.cause.message;
  }
  
  return message;
}

const app = new Hono();

// GET /api/services - List all services
app.get('/', async (c) => {
  try {
    const agent = await getAgent();
    const registry = agent.getRegistry();
    const services = registry.getAllMetadata();
    const runtimeState = agent.getRuntimeStateManager();

    // Filter out soft-deleted services
    let visibleServices = services;
    const state = await runtimeState.load();
    visibleServices = services.filter((s) => {
      const serviceState = state.services[s.id];
      return !serviceState?.deleted;  // 过滤掉 deleted: true 的服务
    });

    const response: ServiceListResponse = {
      services: visibleServices.map((s) => ({
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
    const webConfigManager = agent.getWebConfigManager();
    const services = webConfigManager.getServices();

    const service = registry.getMetadata(id);
    if (!service) {
      return c.json({ error: 'Service not found' }, 404);
    }

    const serviceConfig = services.find((s) => s.id === id);
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

    // Reconnect to Xiaozhi to report service changes
    const xiaozhi = agent.getConnection();
    if (xiaozhi && xiaozhi.isConnected()) {
      console.log('Service started, reconnecting to Xiaozhi to refresh tools');
      await xiaozhi.reconnect().catch(err => 
        console.error('Failed to reconnect Xiaozhi:', err)
      );
    }

    return c.json({ success: true, message: `Service ${id} started` });
  } catch (error: any) {
    console.error('Service start error:', error);
    const errorMessage = getFullErrorMessage(error);
    return c.json({ error: errorMessage }, 500);
  }
});

// POST /api/services/:id/stop - Stop a service
app.post('/:id/stop', async (c) => {
  try {
    const id = c.req.param('id');
    const agent = await getAgent();
    const registry = agent.getRegistry();

    await registry.stop(id);

    // Reconnect to Xiaozhi to report service changes
    const xiaozhi = agent.getConnection();
    if (xiaozhi && xiaozhi.isConnected()) {
      console.log('Service stopped, reconnecting to Xiaozhi to refresh tools');
      await xiaozhi.reconnect().catch(err => 
        console.error('Failed to reconnect Xiaozhi:', err)
      );
    }

    return c.json({ success: true, message: `Service ${id} stopped` });
  } catch (error: any) {
    console.error('Service stop error:', error);
    const errorMessage = getFullErrorMessage(error);
    return c.json({ error: errorMessage }, 500);
  }
});

// POST /api/services - Add a new service
app.post('/', async (c) => {
  try {
    const newService = await c.req.json<ServiceConfig>();
    const agent = await getAgent();
    const webConfigManager = agent.getWebConfigManager();
    const services = webConfigManager.getServices();

    // Validate service ID doesn't exist
    if (services.find((s) => s.id === newService.id)) {
      return c.json({ error: `Service with ID ${newService.id} already exists` }, 400);
    }

    // Add to web config via WebConfigManager
    await webConfigManager.addService({ ...newService, enabled: false });

    // Register the service
    const registry = agent.getRegistry();
    await registry.register(newService);

    // Mark as user-added service in runtime state
    const runtimeState = agent.getRuntimeStateManager();
    await runtimeState.setServiceSource(newService.id, 'user');

    return c.json({ success: true, message: `Service ${newService.id} added`, service: newService });
  } catch (error: any) {
    console.error('Service add error:', error);
    const errorMessage = getFullErrorMessage(error);
    return c.json({ error: errorMessage }, 500);
  }
});

// PUT /api/services/:id - Update a service
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json<Partial<ServiceConfig>>();
    const agent = await getAgent();
    const webConfigManager = agent.getWebConfigManager();
    const registry = agent.getRegistry();

    console.log(`Updating service ${id}`, { updates });

    // Don't allow ID changes
    if (updates.id && updates.id !== id) {
      return c.json({ error: 'Cannot change service ID' }, 400);
    }

    // Update in web config
    console.log('Calling webConfigManager.updateService');
    await webConfigManager.updateService(id, updates);
    console.log('Service updated in config file');

    // If service is running, restart it to apply changes
    if (registry.has(id)) {
      const metadata = registry.getMetadata(id);
      if (metadata?.status === 'running') {
        console.log(`Restarting service ${id} to apply changes`);
        await registry.stop(id);
        
        // Get updated config and re-register
        const services = webConfigManager.getServices();
        const updatedConfig = services.find((s) => s.id === id);
        if (updatedConfig) {
          await registry.register(updatedConfig);
          await registry.start(id);
        }
        
        // Reconnect to Xiaozhi to report service changes
        const xiaozhi = agent.getConnection();
        if (xiaozhi && xiaozhi.isConnected()) {
          console.log('Service updated and restarted, reconnecting to Xiaozhi to refresh tools');
          await xiaozhi.reconnect().catch(err => 
            console.error('Failed to reconnect Xiaozhi:', err)
          );
        }
      }
    }

    return c.json({ success: true, message: `Service ${id} updated` });
  } catch (error: any) {
    console.error('Service update error:', error);
    const errorMessage = getFullErrorMessage(error);
    return c.json({ error: errorMessage }, 500);
  }
});

// DELETE /api/services/:id - Delete a service
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const agent = await getAgent();
    const registry = agent.getRegistry();
    const webConfigManager = agent.getWebConfigManager();
    const runtimeState = agent.getRuntimeStateManager();

    console.log(`Deleting service: ${id}`);

    // Remove from registry if it exists (will stop it if running)
    if (registry.has(id)) {
      await registry.unregister(id);
    }

    // Always completely remove from config file (no more soft delete)
    await webConfigManager.removeService(id);
    console.log(`Service removed from config file: ${id}`);

    // Remove from runtime state
    await runtimeState.removeServiceState(id);
    console.log(`Service removed from runtime state: ${id}`);

    return c.json({ success: true, message: `Service ${id} deleted` });
  } catch (error: any) {
    console.error('Service delete error:', error);
    const errorMessage = getFullErrorMessage(error);
    return c.json({ error: errorMessage }, 500);
  }
});

export default app;
