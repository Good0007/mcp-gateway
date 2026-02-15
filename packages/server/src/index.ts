/**
 * MCP Agent API Server
 * HTTP REST API gateway for GUI frontend
 */

import { serve } from '@hono/node-server';
import app from './app.js';

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`🚀 MCP Agent API Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`✅ Server running at http://localhost:${info.port}`);
  console.log('📡 API endpoints:');
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
});
