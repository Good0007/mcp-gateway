/**
 * Hono App Configuration
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import statusRoutes from './routes/status.js';
import servicesRoutes from './routes/services.js';
import toolsRoutes from './routes/tools.js';
import pluginsRoutes from './routes/plugins.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.route('/api/status', statusRoutes);
app.route('/api/services', servicesRoutes);
app.route('/api/tools', toolsRoutes);
app.route('/api/plugins', pluginsRoutes);

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
