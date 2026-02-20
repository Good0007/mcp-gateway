/**
 * Logs API Routes
 * Retrieve and manage application logs
 */

import { Hono } from 'hono';
import { getLogBuffer } from '@mcp-gateway/core';

const app = new Hono();

// GET /api/logs - Get recent logs
app.get('/', async (c) => {
  try {
    const logBuffer = getLogBuffer();
    
    // Parse query parameters
    const level = c.req.query('level');
    const service = c.req.query('service');
    const search = c.req.query('search');
    const limitStr = c.req.query('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    // Get logs with filters
    const logs = logBuffer.get({
      level: level as any,
      service,
      search,
      limit,
    });

    return c.json({
      logs,
      total: logs.length,
      bufferSize: logBuffer.size(),
    });
  } catch (error: any) {
    console.error('Get logs error:', error);
    return c.json({ error: error.message || 'Failed to get logs' }, 500);
  }
});

// DELETE /api/logs - Clear all logs
app.delete('/', async (c) => {
  try {
    const logBuffer = getLogBuffer();
    logBuffer.clear();

    return c.json({
      success: true,
      message: 'Logs cleared successfully',
    });
  } catch (error: any) {
    console.error('Clear logs error:', error);
    return c.json({ error: error.message || 'Failed to clear logs' }, 500);
  }
});

// GET /api/logs/stream - Server-Sent Events endpoint for real-time logs
app.get('/stream', async (c) => {
  const logBuffer = getLogBuffer();
  
  // Set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = new ReadableStream({
    start(controller) {
      // Send initial logs
      const initialLogs = logBuffer.getAll();
      controller.enqueue(`data: ${JSON.stringify({ type: 'init', logs: initialLogs })}\n\n`);

      // Listen for new logs
      const onLog = (log: any) => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'log', log })}\n\n`);
      };

      logBuffer.on('log', onLog);

      // Cleanup on close
      return () => {
        logBuffer.off('log', onLog);
      };
    },
  });

  return new Response(stream);
});

export default app;
