/**
 * Authentication API Routes
 * POST /api/auth/login - Login with username and password
 * POST /api/auth/logout - Logout
 * GET /api/auth/status - Check if auth is enabled and if user is authenticated
 * GET /api/auth/verify - Verify current session
 */

import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import crypto from 'node:crypto';
import { sessions } from '../middleware/auth.js';
import { ENV } from '../env.js';

const app = new Hono();

// Environment variables for authentication
const AUTH_ENABLED = ENV.AUTH_ENABLED;
const AUTH_USERNAME = ENV.AUTH_USERNAME;
const AUTH_PASSWORD = ENV.AUTH_PASSWORD;

// Session timeout: 24 hours
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check authentication status
 * GET /api/auth/status
 */
app.get('/status', (c) => {
  if (!AUTH_ENABLED) {
    return c.json({
      enabled: false,
      authenticated: true, // If auth is disabled, consider user as authenticated
    });
  }

  const sessionId = getCookie(c, 'session_id');
  const session = sessionId ? sessions.get(sessionId) : null;
  const authenticated = !!session && (Date.now() - session.createdAt < SESSION_TIMEOUT);

  return c.json({
    enabled: true,
    authenticated,
  });
});

/**
 * Login
 * POST /api/auth/login
 */
app.post('/login', async (c) => {
  if (!AUTH_ENABLED) {
    return c.json({ success: false, message: 'Authentication is disabled' }, 400);
  }

  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ success: false, message: 'Username and password are required' }, 400);
    }

    // Validate credentials
    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      // Create session
      const sessionId = generateSessionId();
      sessions.set(sessionId, {
        username,
        createdAt: Date.now(),
      });

      // Set cookie (httpOnly for security)
      setCookie(c, 'session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: SESSION_TIMEOUT / 1000, // maxAge is in seconds
        path: '/',
      });

      return c.json({
        success: true,
        message: 'Login successful',
      });
    } else {
      return c.json({ success: false, message: 'Invalid username or password' }, 401);
    }
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, message: 'Internal server error' }, 500);
  }
});

/**
 * Logout
 * POST /api/auth/logout
 */
app.post('/logout', (c) => {
  const sessionId = getCookie(c, 'session_id');
  
  if (sessionId) {
    sessions.delete(sessionId);
  }

  deleteCookie(c, 'session_id', { path: '/' });

  return c.json({ success: true, message: 'Logout successful' });
});

/**
 * Verify session
 * GET /api/auth/verify
 */
app.get('/verify', (c) => {
  if (!AUTH_ENABLED) {
    return c.json({ valid: true });
  }

  const sessionId = getCookie(c, 'session_id');
  const session = sessionId ? sessions.get(sessionId) : null;
  const valid = !!session && (Date.now() - session.createdAt < SESSION_TIMEOUT);

  if (valid) {
    return c.json({ valid: true, username: session!.username });
  } else {
    return c.json({ valid: false }, 401);
  }
});

export default app;
