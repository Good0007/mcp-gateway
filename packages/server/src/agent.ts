/**
 * MCP Agent Instance Manager
 * Singleton instance of MCPAgent for API server
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { MCPAgent } from '@mcp-agent/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default config directory (can be overridden by env var)
// MCPAgent will look for web-config.json in this directory
const configDir = process.env.MCP_CONFIG_DIR || path.resolve(__dirname, '../../../config');

let agentInstance: MCPAgent | null = null;
let starting = false;

/**
 * Get or create MCP Agent instance
 */
export async function getAgent(): Promise<MCPAgent> {
  if (agentInstance) {
    return agentInstance;
  }

  if (starting) {
    // Wait for initialization
    while (starting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (agentInstance) return agentInstance;
  }

  starting = true;
  try {
    console.log(`📂 Config directory: ${configDir}`);
    console.log(`📄 Loading config from: ${configDir}/web-config.json`);
    agentInstance = new MCPAgent(configDir);
    
    // Start the agent
    await agentInstance.start();
    console.log('✅ MCP Agent initialized successfully');
    
    return agentInstance;
  } catch (error) {
    console.error('❌ Failed to initialize MCP Agent:', error);
    agentInstance = null;  // Clear instance on failure
    throw error;
  } finally {
    starting = false;
  }
}

/**
 * Check if agent is initialized
 */
export function hasAgent(): boolean {
  return agentInstance !== null;
}

/**
 * Shutdown agent (for graceful exit)
 */
export async function stopAgent(): Promise<void> {
  if (agentInstance) {
    await agentInstance.stop();
    agentInstance = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await stopAgent();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await stopAgent();
  process.exit(0);
});
