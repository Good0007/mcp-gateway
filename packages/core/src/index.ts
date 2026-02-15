/**
 * MCP Agent Main Entry Point
 */

export * from './types/index.js';
export * from './utils/index.js';
export * from './adapters/index.js';
export * from './core/index.js';
export * from './config/config-loader.js';
export { RuntimeStateManager, RuntimeStateEvent } from './config/runtime-state-manager.js';
export type { ServiceRuntimeState, RuntimeState } from './config/runtime-state-manager.js';
export { WebConfigManager, WebConfigEvent } from './config/web-config-manager.js';
export type { WebConfig, XiaozhiEndpoint } from './config/web-config-manager.js';

// Re-export main agent class for convenience
export { MCPAgent } from './core/mcp-agent.js';
