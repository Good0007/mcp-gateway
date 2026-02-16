/**
 * MCP Proxy Routes
 *
 * Supports two transports (auto-detected per request):
 *   1. Streamable HTTP  (MCP 2025-11-25 — preferred by VS Code)
 *      POST /sse  →  JSON response in POST body
 *   2. Legacy SSE       (MCP 2024-11-05 — fallback)
 *      GET  /sse  →  SSE stream; POST /sse?sessionId=xxx → 202
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getAgent } from '../agent.js';

const app = new Hono();

/* ------------------------------------------------------------------ */
/*  Auth & enabled check middleware                                    */
/* ------------------------------------------------------------------ */

/**
 * Validate that the proxy is enabled and (optionally) check Bearer token.
 * Returns null if OK, or a Response to short-circuit.
 */
async function validateAccess(c: any): Promise<Response | null> {
  try {
    const agent = await getAgent();
    const webConfig = agent.getWebConfigManager();
    const proxyConfig = webConfig.getMcpProxy();

    // Check if proxy is enabled
    if (!proxyConfig.enabled) {
      return c.json(
        { jsonrpc: '2.0', error: { code: -32000, message: 'MCP Proxy is disabled' }, id: null },
        403,
      );
    }

    // Check token if configured
    if (proxyConfig.token) {
      const authHeader = c.req.header('authorization') || '';
      const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      if (bearerToken !== proxyConfig.token) {
        return c.json(
          { jsonrpc: '2.0', error: { code: -32000, message: 'Unauthorized: invalid or missing token' }, id: null },
          401,
        );
      }
    }

    return null; // access granted
  } catch {
    // If config can't be read, allow access (fail-open for dev)
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Session stores                                                     */
/* ------------------------------------------------------------------ */

/** Streamable HTTP sessions (stateless JSON request/response) */
interface StreamableSession {
  sessionId: string;
  initialized: boolean;
}
const streamableSessions = new Map<string, StreamableSession>();

/** Legacy SSE sessions (long-lived SSE stream) */
interface LegacySSESession {
  sessionId: string;
  responseHandler: (data: any) => Promise<void>;
}
const legacySessions = new Map<string, LegacySSESession>();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isInitializeRequest(msg: any): boolean {
  if (Array.isArray(msg)) return msg.some(isInitializeRequest);
  return msg?.method === 'initialize' && msg?.jsonrpc === '2.0';
}

function isNotification(msg: any): boolean {
  // Notifications have method but NO id
  return msg?.method !== undefined && msg?.id === undefined;
}

/* ------------------------------------------------------------------ */
/*  Core message processing                                            */
/* ------------------------------------------------------------------ */

async function processMessage(message: any): Promise<any> {
  const { jsonrpc, id, method, params } = message;

  try {
    const agent = await getAgent();
    const aggregator = agent.getAggregator();
    let result: any;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true },
          },
          serverInfo: {
            name: 'mcp-agent-proxy',
            version: '1.0.0',
          },
        };
        break;

      case 'notifications/initialized':
        // Client acknowledgement — nothing to return
        return null;

      case 'tools/list': {
        const tools = await aggregator.getAllTools();
        result = {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: {
              type: 'object' as const,
              properties: Object.entries(t.parameters).reduce(
                (acc, [key, param]) => {
                  acc[key] = {
                    type: param.type,
                    description: param.description,
                    ...(param.enum && { enum: param.enum }),
                    ...(param.default !== undefined && {
                      default: param.default,
                    }),
                    // JSON Schema requires "items" for array types
                    ...(param.type === 'array' && {
                      items: param.items
                        ? { type: param.items.type, description: param.items.description }
                        : { type: 'string' },
                    }),
                  };
                  return acc;
                },
                {} as Record<string, any>,
              ),
              required: Object.entries(t.parameters)
                .filter(([_, p]) => p.required)
                .map(([name]) => name),
            },
          })),
        };
        break;
      }

      case 'tools/call': {
        const callResult = await aggregator.callTool({
          name: params.name,
          arguments: params.arguments,
        });
        result = callResult;
        break;
      }

      case 'ping':
        result = {};
        break;

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }

    return { jsonrpc, id, result };
  } catch (error: any) {
    console.error(`[MCP Proxy] Error processing ${method}:`, error);
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message || 'Internal error',
      },
    };
  }
}

/* ================================================================== */
/*  ROUTE: POST /sse                                                   */
/*  Handles BOTH Streamable HTTP and legacy SSE POST                   */
/* ================================================================== */

app.post('/sse', async (c) => {
  try {
    const denied = await validateAccess(c);
    if (denied) return denied;

    const body = await c.req.json();

    // ---- Determine transport mode ----
    const sessionIdQuery = c.req.query('sessionId');           // legacy SSE
    const mcpSessionId   = c.req.header('mcp-session-id');     // streamable HTTP

    // ========== Legacy SSE mode (has ?sessionId=…) ==========
    if (sessionIdQuery) {
      const session = legacySessions.get(sessionIdQuery);
      if (!session) {
        return c.json(
          { jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null },
          404,
        );
      }

      if (!body?.jsonrpc) {
        return c.json(
          { jsonrpc: '2.0', error: { code: -32700, message: 'Invalid JSON-RPC' }, id: null },
          400,
        );
      }

      console.log(`[MCP Proxy][SSE] ${body.method} (id:${body.id}) session=${sessionIdQuery}`);

      if (isNotification(body)) {
        // e.g. notifications/initialized — no response needed
        return c.body(null, 202);
      }

      const response = await processMessage(body);
      if (response) await session.responseHandler(response);
      return c.body(null, 202);
    }

    // ========== Streamable HTTP mode ==========

    // Case 1: initialize request (no session yet)
    if (!mcpSessionId && isInitializeRequest(body)) {
      const newSessionId = generateSessionId();
      streamableSessions.set(newSessionId, {
        sessionId: newSessionId,
        initialized: true,
      });

      console.log(`[MCP Proxy][HTTP] initialize → new session ${newSessionId}`);

      const response = await processMessage(body);
      return c.json(response, 200, {
        'mcp-session-id': newSessionId,
      });
    }

    // Case 2: subsequent requests (has mcp-session-id header)
    if (mcpSessionId) {
      const session = streamableSessions.get(mcpSessionId);
      if (!session) {
        return c.json(
          { jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null },
          404,
        );
      }

      // Notification (no id) — accept and return 202
      if (isNotification(body)) {
        console.log(`[MCP Proxy][HTTP] notification: ${body.method} session=${mcpSessionId}`);
        return c.body(null, 202);
      }

      console.log(`[MCP Proxy][HTTP] ${body.method} (id:${body.id}) session=${mcpSessionId}`);

      const response = await processMessage(body);
      return c.json(response, 200, {
        'mcp-session-id': mcpSessionId,
      });
    }

    // Case 3: no session, not initialize → error
    console.warn('[MCP Proxy] POST /sse without session or initialize');
    return c.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Bad Request: send initialize first or include mcp-session-id header' }, id: null },
      400,
    );
  } catch (error: any) {
    console.error('[MCP Proxy] POST /sse error:', error);
    return c.json(
      { jsonrpc: '2.0', error: { code: -32603, message: error.message || 'Internal error' }, id: null },
      500,
    );
  }
});

/* ================================================================== */
/*  ROUTE: GET /sse                                                    */
/*  Legacy SSE transport — long-lived event stream                     */
/* ================================================================== */

app.get('/sse', async (c) => {
  const denied = await validateAccess(c);
  if (denied) return denied;

  const sessionId = generateSessionId();

  return streamSSE(c, async (stream) => {
    let isClosed = false;

    const session: LegacySSESession = {
      sessionId,
      responseHandler: async (data: any) => {
        if (isClosed) return;
        await stream.writeSSE({ event: 'message', data: JSON.stringify(data) });
      },
    };

    legacySessions.set(sessionId, session);

    // Tell client where to POST messages
    const endpointPath = `/mcp/sse?sessionId=${sessionId}`;
    await stream.writeSSE({ event: 'endpoint', data: endpointPath });
    console.log(`[MCP Proxy][SSE] stream opened: ${sessionId}  endpoint=${endpointPath}`);

    // Keep-alive
    const ping = setInterval(async () => {
      if (isClosed) { clearInterval(ping); return; }
      try { await stream.writeSSE({ event: 'ping', data: '' }); }
      catch { clearInterval(ping); }
    }, 15_000);

    const cleanup = () => {
      isClosed = true;
      clearInterval(ping);
      legacySessions.delete(sessionId);
      console.log(`[MCP Proxy][SSE] stream closed: ${sessionId}`);
    };

    c.req.raw.signal.addEventListener('abort', cleanup);
    await stream.onAbort(cleanup);
  });
});

/* ================================================================== */
/*  ROUTE: DELETE /sse                                                 */
/*  Streamable HTTP session termination                                */
/* ================================================================== */

app.delete('/sse', async (c) => {
  const denied = await validateAccess(c);
  if (denied) return denied;

  const mcpSessionId = c.req.header('mcp-session-id');
  if (mcpSessionId && streamableSessions.has(mcpSessionId)) {
    streamableSessions.delete(mcpSessionId);
    console.log(`[MCP Proxy][HTTP] session deleted: ${mcpSessionId}`);
    return c.body(null, 200);
  }
  return c.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null },
    404,
  );
});

/* ================================================================== */
/*  ROUTE: GET /status                                                 */
/* ================================================================== */

app.get('/status', async (c) => {
  try {
    const agent = await getAgent();
    const aggregator = agent.getAggregator();
    const webConfig = agent.getWebConfigManager();
    const proxyConfig = webConfig.getMcpProxy();
    const tools = await aggregator.getAllTools();

    return c.json({
      enabled: proxyConfig.enabled,
      hasToken: !!proxyConfig.token,
      protocol: 'MCP 2024-11-05 / Streamable HTTP',
      transports: ['streamable-http', 'sse'],
      endpoints: { sse: '/mcp/sse' },
      stats: {
        httpSessions: streamableSessions.size,
        sseSessions: legacySessions.size,
        totalTools: tools.length,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
