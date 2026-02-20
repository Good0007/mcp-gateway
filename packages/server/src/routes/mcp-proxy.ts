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
import { AgentEvent } from '@mcp-agent/core';

const app = new Hono();

/* ------------------------------------------------------------------ */
/*  Notification Logic                                                 */
/* ------------------------------------------------------------------ */

// Setup listener for config changes to notify clients
// We use a global variable to ensure listener is only set up once
// even if this file is imported multiple times or Hono re-initializes routes
declare global {
  var _mcpProxyListenerSetup: boolean;
}

if (!global._mcpProxyListenerSetup) {
  global._mcpProxyListenerSetup = true;
  
  // Use setImmediate to allow other modules to initialize
  setTimeout(async () => {
    try {
      const agent = await getAgent();

      console.log('[MCP Proxy] Setting up TOOLS_UPDATED listener on agent...');

      // Listen for AgentEvent.TOOLS_UPDATED — fired by mcp-agent AFTER services have fully
      // reloaded (add / remove / update) so clients always see a consistent tool list.
      agent.on(AgentEvent.TOOLS_UPDATED, () => {
        console.log('[MCP Proxy] Received TOOLS_UPDATED event, notifying clients');
        notifyClientsOfToolChange();
      });

      console.log('[MCP Proxy] TOOLS_UPDATED listener setup successfully');
    } catch (error) {
      console.error('[MCP Proxy] Failed to setup notification listener:', error);
      global._mcpProxyListenerSetup = false; // Retry next time if failed
    }
  }, 1000);
}

function notifyClientsOfToolChange() {
  const legacyCount = legacySessions.size;
  const streamableCount = streamableSessions.size;
  const clientCount = legacyCount + streamableCount;
  if (clientCount === 0) return;

  console.log(`[MCP Proxy] Notifying ${legacyCount} SSE + ${streamableCount} Streamable-HTTP clients of tool list update`);

  const notification = {
    jsonrpc: '2.0',
    method: 'notifications/tools/list_changed',
    params: {},
  };

  // Send the standard MCP notification through the live SSE stream.
  // Well-behaved clients (VS Code) will react by calling tools/list.
  // The SSE stream stays alive — do NOT close it. Trae's SSE client
  // does not handle server-side disconnects gracefully (enters a
  // permanent error state instead of reconnecting).
  for (const session of legacySessions.values()) {
    session.responseHandler(notification).catch(err => {
      console.error(`[MCP Proxy] Failed to notify SSE session ${session.sessionId}:`, err);
    });
  }

  // Keep Streamable HTTP sessions intact.
  // VS Code may refresh tools using the existing mcp-session-id after receiving
  // tools/list_changed via SSE. Clearing sessions here causes avoidable
  // "Session not found" (404) errors for in-flight follow-up requests.
}

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
      console.warn('[MCP Proxy] Access denied: Proxy is disabled');
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
        console.warn('[MCP Proxy] Access denied: Invalid or missing token', {
          receivedLength: bearerToken?.length || 0,
          expectedLength: proxyConfig.token.length,
          receivedStart: bearerToken?.slice(0, 3) || 'null',
        });
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
  /** Close the SSE stream from the server side, forcing client to reconnect */
  close: () => void;
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
        console.log(`[MCP Proxy] tools/list request: found ${tools.length} tools`);
        result = {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: {
              type: 'object' as const,
              properties: t.parameters ? Object.entries(t.parameters).reduce(
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
              ) : {},
              required: t.parameters ? Object.entries(t.parameters)
                .filter(([_, p]) => p.required)
                .map(([name]) => name) : [],
            },
          })),
        };
        console.log(`[MCP Proxy] tools/list response: ${JSON.stringify(result.tools.map((t: any) => t.name))}`);
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
  console.log('[MCP Proxy] POST /sse request received', {
    headers: c.req.header(),
    query: c.req.query(),
  });

  try {
    const denied = await validateAccess(c);
    if (denied) {
      console.warn('[MCP Proxy] POST /sse access denied');
      return denied;
    }

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
  console.log('[MCP Proxy] GET /sse request received', {
    headers: c.req.header(),
    query: c.req.query(),
  });

  const denied = await validateAccess(c);
  if (denied) {
    console.warn('[MCP Proxy] GET /sse access denied');
    return denied;
  }

  const sessionId = generateSessionId();

  // Explicitly set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return streamSSE(c, async (stream) => {
    let isClosed = false;

    // Cleanup function — removes session and aborts stream immediately
    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      legacySessions.delete(sessionId);
      console.log(`[MCP Proxy][SSE] stream closed: ${sessionId}`);
      // Abort the underlying stream so sleep() and writeSSE() stop
      // immediately, causing the SSE connection to close right away.
      stream.abort();
    };

    const session: LegacySSESession = {
      sessionId,
      responseHandler: async (data: any) => {
        if (isClosed) return;
        try {
          await stream.writeSSE({ event: 'message', data: JSON.stringify(data) });
        } catch (e) {
          console.error(`[MCP Proxy][SSE] write error for session ${sessionId}:`, e);
          cleanup();
        }
      },
      close: () => {
        cleanup();
      },
    };

    legacySessions.set(sessionId, session);

    // Tell client where to POST messages
    let baseUrl = '';
    try {
      const requestUrl = new URL(c.req.url);
      baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    } catch (e) {
      // Fallback if c.req.url is relative
      const host = c.req.header('host') || 'localhost';
      const proto = c.req.header('x-forwarded-proto') || 'http';
      baseUrl = `${proto}://${host}`;
    }
    const endpointPath = `${baseUrl}/mcp/sse?sessionId=${sessionId}`;
    
    await stream.writeSSE({ event: 'endpoint', data: endpointPath });
    console.log(`[MCP Proxy][SSE] stream opened: ${sessionId}  endpoint=${endpointPath}`);

    // Register abort listener
    stream.onAbort(cleanup);

    // Keep connection alive loop
    while (!isClosed) {
      try {
        await stream.writeSSE({ event: 'ping', data: '' });
      } catch (e) {
        console.error(`[MCP Proxy][SSE] ping error for session ${sessionId}:`, e);
        cleanup();
        break;
      }
      await stream.sleep(15000);
    }
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
        activeSessions: streamableSessions.size + legacySessions.size,
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
