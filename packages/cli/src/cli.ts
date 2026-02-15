#!/usr/bin/env node

/**
 * MCP Agent CLI
 * Command-line interface for running the MCP agent
 */

import { MCPAgent, logger } from '@mcp-agent/core';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

// Resolve project root (monorepo root = cli/../../)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const rawPath =
    args.find((arg) => arg.startsWith('--config='))?.split('=')[1] ||
    process.env.MCP_AGENT_CONFIG ||
    'config/agent-config.json';

  // If not absolute, resolve relative to project root
  const configPath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(PROJECT_ROOT, rawPath);

  return { configPath };
}

/**
 * Main function
 */
async function main() {
  const { configPath } = parseArgs();

  logger.info('Starting MCP Agent', { configPath });

  // Create agent
  const agent = new MCPAgent(configPath);

  // Handle errors
  agent.on('agent:error', (error: Error) => {
    logger.error('Agent error', { error });
  });

  // Handle ready
  agent.on('agent:ready', () => {
    logger.info('Agent is ready and connected');
    const status = agent.getStatus();
    logger.info('Agent status', status);
  });

  // Handle config changes
  agent.on('agent:config:changed', () => {
    logger.info('Configuration reloaded');
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    try {
      await agent.stop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    void shutdown();
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled rejection', { reason });
    void shutdown();
  });

  // Start agent
  try {
    await agent.start();
  } catch (error) {
    logger.error('Failed to start agent', { error });
    process.exit(1);
  }
}

// Run
main().catch((error: unknown) => {
  logger.error('Fatal error', { error });
  process.exit(1);
});
