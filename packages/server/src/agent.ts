/**
 * MCP Agent Instance Manager
 * Singleton instance of MCPAgent for API server
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { MCPAgent } from '@mcp-agent/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default config path (can be overridden by env var)
const configPath = process.env.MCP_CONFIG_PATH || path.resolve(__dirname, '../../../config/agent-config.json');

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
    console.log(`📂 Loading config from: ${configPath}`);
    agentInstance = new MCPAgent(configPath);
    
    // Start the agent
    await agentInstance.start();
    console.log('✅ MCP Agent initialized successfully');
    
    return agentInstance;
  } catch (error) {
    console.error('❌ Failed to initialize MCP Agent:', error);
    starting = false;
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
