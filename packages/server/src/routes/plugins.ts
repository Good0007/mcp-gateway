/**
 * Plugins API Routes
 * Proxy for MCP World API to avoid CORS issues
 */

import { Hono } from 'hono';

const app = new Hono();

// MCP World API configuration
const MCP_WORLD_API = 'https://www.mcpworld.com/api/mcp-market/servers';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * MCP World API Response Type
 */
interface MCPWorldResponse {
  code: number;
  data: any;
  status: number;
}

/**
 * Fetch data from MCP World API with timeout
 */
async function fetchMCPWorld(params: Record<string, string>) {
  const url = new URL(MCP_WORLD_API);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MCP-Agent/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MCP World API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as MCPWorldResponse;
    
    if (data.code !== 0) {
      throw new Error(`MCP World API returned error code: ${data.code}`);
    }

    return data.data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout', { cause: error });
    }
    throw error;
  }
}

/**
 * GET /api/plugins
 * Query parameters:
 * - wd: search keyword or category key (default: "all")
 * - type: query type (default: "tag")
 * - pn: page number, 0-based (default: 0)
 * - lg: language, "zh" or "en" (default: "zh")
 * - pl: page limit (default: 100)
 */
app.get('/', async (c) => {
  try {
    const wd = c.req.query('wd') || 'all';
    // const type = c.req.query('type') || 'tag'; 
    const pn = c.req.query('pn') || '0';
    const lg = c.req.query('lg') || 'zh';
    const pl = c.req.query('pl') || '100';

    // 如果 wd 不是 'all' 且没有指定 type，则认为是普通搜索 type=normal
    // 根据需求：https://www.mcpworld.com/api/mcp-market/servers?wd=%E6%95%B0%E6%8D%AE%E5%BA%93&type=normal&pn=0&lg=zh&pl=30
    let type = c.req.query('type');
    if (!type) {
      if (wd === 'all') {
        type = 'tag';
      } else {
        type = 'normal';
      }
    }

    const data = await fetchMCPWorld({
      wd,
      type,
      pn,
      lg,
      pl,
    });

    return c.json(data);
  } catch (error) {
    console.error('MCP World API proxy error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch plugins';
    return c.json({ 
      error: message,
      fallback: true,
    }, 500);
  }
});

/**
 * GET /api/plugins/detail/:id
 * Get server detail by ID
 * Query parameters:
 * - lg: language, "zh" or "en" (default: "zh")
 */
app.get('/detail/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const lg = c.req.query('lg') || 'zh';
    
    const url = `https://www.mcpworld.com/api/mcp-market/server/detail?id=${id}&lg=${lg}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MCP-Agent/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MCP World API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as MCPWorldResponse;
    
    if (result.code !== 0) {
      throw new Error(`MCP World API returned error code: ${result.code}`);
    }

    return c.json(result.data);
  } catch (error) {
    console.error('Plugin detail error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get plugin detail';
    return c.json({ 
      error: message,
      fallback: true,
    }, 500);
  }
});

export default app;
