/**
 * Authentication Middleware
 * Protects API routes when authentication is enabled
 */

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { ENV } from '../env.js';

// Simple in-memory session store (shared with auth routes)
// In production, use Redis or similar
export const sessions = new Map<string, { username: string; createdAt: number }>();

const AUTH_ENABLED = ENV.AUTH_ENABLED;
const SESSION_TIMEOUT = 3 * 24 * 60 * 60 * 1000; // 24 hours

/**
 * Authentication middleware
 * Verifies session for protected routes
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  // If authentication is disabled, allow all requests
  if (!AUTH_ENABLED) {
    await next();
    return;
  }

  // Get session ID from cookie
  const sessionId = getCookie(c, 'session_id');
  
  if (!sessionId) {
    return c.json({ error: 'Unauthorized', message: 'No session found' }, 401);
  }

  // Verify session
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Unauthorized', message: 'Invalid session' }, 401);
  }

  // Check if session has expired
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessions.delete(sessionId);
    return c.json({ error: 'Unauthorized', message: 'Session expired' }, 401);
  }

  // Session is valid, continue
  await next();
}

/**
 * Optional authentication middleware
 * Does not block requests if auth is disabled or session is invalid
 * But adds user info to context if authenticated
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  if (AUTH_ENABLED) {
    const sessionId = getCookie(c, 'session_id');
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session && (Date.now() - session.createdAt < SESSION_TIMEOUT)) {
        // Add user info to context
        c.set('user', { username: session.username });
      }
    }
  }
  
  await next();
}
