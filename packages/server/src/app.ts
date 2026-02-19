/**
 * Hono App Configuration
 */

// MUST be imported first to load environment variables
import './env.js';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';
import statusRoutes from './routes/status.js';
import servicesRoutes from './routes/services.js';
import toolsRoutes from './routes/tools.js';
import pluginsRoutes from './routes/plugins.js';
import configRoutes from './routes/config.js';
import logsRoutes from './routes/logs.js';
import environmentRoutes from './routes/environment.js';
import mcpProxyRoutes from './routes/mcp-proxy.js';

// Resolve public dir relative to this file (dist/app.js -> ../public)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Authentication routes (no auth middleware here)
app.route('/api/auth', authRoutes);

// Protected API routes (with auth middleware)
app.use('/api/*', authMiddleware);
app.route('/api/status', statusRoutes);
app.route('/api/services', servicesRoutes);
app.route('/api/tools', toolsRoutes);
app.route('/api/plugins', pluginsRoutes);
app.route('/api/config', configRoutes);
app.route('/api/logs', logsRoutes);
app.route('/api/environment', environmentRoutes);

// MCP Proxy routes (for external MCP clients)
app.route('/mcp', mcpProxyRoutes);

// Serve static files in production (built web app)
if (process.env.NODE_ENV === 'production') {
  if (fs.existsSync(publicDir)) {
    // Serve static assets (CSS, JS, images, etc.)
    app.use('/assets/*', serveStatic({ root: publicDir }));
    app.use('/vite.svg', serveStatic({ root: publicDir }));
    
    // Fallback to index.html for SPA routes (but not for /api/* or /mcp/*)
    app.get('*', (c) => {
      const reqPath = c.req.path;
      // Don't serve index.html for API or MCP routes
      if (reqPath.startsWith('/api/') || reqPath.startsWith('/mcp/')) {
        return c.notFound();
      }
      // Serve index.html for all other routes (SPA fallback)
      return c.html(fs.readFileSync(path.join(publicDir, 'index.html'), 'utf-8'));
    });
  } else {
    console.warn(`⚠️  前端静态文件目录不存在: ${publicDir}`);
    console.warn('   请运行 "npm run build:full" 或 "bun run build:full" 构建完整应用');
  }
}

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  }, 500);
});

export default app;
