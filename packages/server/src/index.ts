/**
 * MCP Agent API Server
 * HTTP REST API gateway for GUI frontend
 */

// Load environment variables (MUST be first)
import { ENV } from './env.js';
import { serve } from '@hono/node-server';
import app from './app.js';

const port = ENV.PORT;

console.log(`🚀 MCP Agent API Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
}, (info) => {
  console.log(`✅ Server running at http://${info.address}:${info.port}`);
  console.log('');
  
  console.log('📡 API endpoints:');
  console.log('   GET    /api/auth/status');
  console.log('   POST   /api/auth/login');
  console.log('   POST   /api/auth/logout');
  console.log('   GET    /api/auth/verify');
  console.log('   GET    /api/status');
  console.log('   GET    /api/services');
  console.log('   GET    /api/services/:id');
  console.log('   POST   /api/services/:id/start');
  console.log('   POST   /api/services/:id/stop');
  console.log('   GET    /api/tools');
  console.log('   POST   /api/tools/call');
  console.log('   GET    /api/plugins');
  console.log('   GET    /api/config');
  console.log('   GET    /api/config/export');
  console.log('   POST   /api/config/import');
  console.log('   GET    /api/config/endpoints');
  console.log('   POST   /api/config/endpoints');
  console.log('   DELETE /api/config/endpoints/:id');
  console.log('   POST   /api/config/endpoints/:id/select');
  console.log('   GET    /api/config/preferences');
  console.log('   PATCH  /api/config/preferences');
  console.log('   GET    /api/config/mcp-proxy');
  console.log('   PATCH  /api/config/mcp-proxy');
  console.log('   POST   /api/config/mcp-proxy/generate-token');
  console.log('');
  console.log('🔌 MCP Proxy endpoints (for external MCP clients):');
  console.log('   POST   /mcp/sse          - Streamable HTTP endpoint');
  console.log('   GET    /mcp/sse          - Legacy SSE transport');
  console.log('   DELETE /mcp/sse          - Close session');
  console.log('   GET    /mcp/status       - Proxy status');
});
