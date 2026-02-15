/**
 * Web Configuration API Routes
 * Manage user configurations from Web UI
 */

import { Hono } from 'hono';
import { getAgent } from '../agent.js';
import type { 
  WebConfigResponse, 
  ExportConfigResponse,
  XiaozhiEndpoint,
} from '@mcp-agent/shared';

const app = new Hono();

// GET /api/config - Get full web configuration
app.get('/', async (c) => {
  try {
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    const config = webConfig.getConfig();
    if (!config) {
      // Config not loaded yet, try to load it
      await webConfig.load();
      const loadedConfig = webConfig.getConfig();
      if (!loadedConfig) {
        return c.json({ error: 'Failed to load configuration' }, 500);
      }
      return c.json<WebConfigResponse>({ config: loadedConfig });
    }
    
    return c.json<WebConfigResponse>({ config });
  } catch (error: any) {
    console.error('Get web config error:', error);
    return c.json({ error: error.message || 'Failed to get configuration' }, 500);
  }
});

// GET /api/config/export - Export configuration as JSON
app.get('/export', async (c) => {
  try {
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    const content = await webConfig.exportConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mcp-agent-config-${timestamp}.json`;

    const response: ExportConfigResponse = {
      filename,
      content,
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Export config error:', error);
    return c.json({ error: error.message || 'Failed to export configuration' }, 500);
  }
});

// POST /api/config/import - Import configuration from JSON
app.post('/import', async (c) => {
  try {
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    const body = await c.req.json<{ content: string }>();
    
    if (!body.content) {
      return c.json({ error: 'Missing configuration content' }, 400);
    }

    await webConfig.importConfig(body.content);

    return c.json({ 
      success: true, 
      message: 'Configuration imported successfully' 
    });
  } catch (error: any) {
    console.error('Import config error:', error);
    return c.json({ error: error.message || 'Failed to import configuration' }, 500);
  }
});

// ==================== Endpoint Management ====================

// GET /api/config/endpoints - Get all endpoints
app.get('/endpoints', async (c) => {
  try {
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    const endpoints = webConfig.getEndpoints();
    const current = webConfig.getCurrentEndpoint();

    return c.json({ 
      endpoints,
      currentEndpointId: current?.id,
    });
  } catch (error: any) {
    console.error('Get endpoints error:', error);
    return c.json({ error: error.message || 'Failed to get endpoints' }, 500);
  }
});

// POST /api/config/endpoints - Add new endpoint
app.post('/endpoints', async (c) => {
  try {
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    const body = await c.req.json<Omit<XiaozhiEndpoint, 'id' | 'createdAt'>>();
    
    if (!body.name || !body.url) {
      return c.json({ error: 'Missing name or url' }, 400);
    }

    const endpoint = await webConfig.addEndpoint(body);

    return c.json({ 
      success: true, 
      message: 'Endpoint added successfully',
      endpoint,
    });
  } catch (error: any) {
    console.error('Add endpoint error:', error);
    return c.json({ error: error.message || 'Failed to add endpoint' }, 500);
  }
});

// DELETE /api/config/endpoints/:id - Remove endpoint
app.delete('/endpoints/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    await webConfig.removeEndpoint(id);

    return c.json({ 
      success: true, 
      message: 'Endpoint removed successfully',
    });
  } catch (error: any) {
    console.error('Remove endpoint error:', error);
    return c.json({ error: error.message || 'Failed to remove endpoint' }, 500);
  }
});

// POST /api/config/endpoints/:id/select - Set current endpoint
app.post('/endpoints/:id/select', async (c) => {
  try {
    const id = c.req.param('id');
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    await webConfig.setCurrentEndpoint(id);

    return c.json({ 
      success: true, 
      message: 'Current endpoint updated',
    });
  } catch (error: any) {
    console.error('Select endpoint error:', error);
    return c.json({ error: error.message || 'Failed to select endpoint' }, 500);
  }
});

// ==================== Preferences Management ====================

// GET /api/config/preferences - Get preferences
app.get('/preferences', async (c) => {
  try {
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    const preferences = webConfig.getPreferences();

    return c.json({ preferences });
  } catch (error: any) {
    console.error('Get preferences error:', error);
    return c.json({ error: error.message || 'Failed to get preferences' }, 500);
  }
});

// PATCH /api/config/preferences - Update preferences
app.patch('/preferences', async (c) => {
  try {
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    
    if (!webConfig) {
      return c.json({ error: 'Web config manager not initialized' }, 500);
    }

    const updates = await c.req.json();
    await webConfig.updatePreferences(updates);

    return c.json({ 
      success: true, 
      message: 'Preferences updated successfully',
    });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    return c.json({ error: error.message || 'Failed to update preferences' }, 500);
  }
});

export default app;
