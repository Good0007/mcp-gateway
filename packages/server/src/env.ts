/**
 * Environment Variables Configuration
 * This file MUST be imported before any other modules that read env vars
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Try to find .env.local in current dir, parent dir, or grandparent dir
const possiblePaths = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '..', '.env.local'),
  resolve(process.cwd(), '../..', '.env.local'),
];

for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    console.log(`📄 Loading environment from: ${envPath}`);
    config({ path: envPath });
    break;
  }
}

// Load .env as fallback
config();

// Export env vars for verification
export const ENV = {
  AUTH_ENABLED: process.env.MCP_AGENT_AUTH?.toLowerCase() === 'true',
  AUTH_USERNAME: process.env.MCP_AGENT_USERNAME || 'admin',
  AUTH_PASSWORD: process.env.MCP_AGENT_PASSWORD || 'admin',
  COOKIE_DOMAIN: process.env.MCP_AGENT_COOKIE_DOMAIN || undefined, // undefined = auto-detect
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Log auth status
console.log(`🔒 Auth Status: ${ENV.AUTH_ENABLED ? 'ENABLED' : 'DISABLED'}`);
if (ENV.AUTH_ENABLED) {
  console.log(`   Username: ${ENV.AUTH_USERNAME}`);
}
