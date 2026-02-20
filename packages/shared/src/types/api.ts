/**
 * API Request/Response Type Definitions
 * REST API contract between GUI and Server
 */

import type { ServiceConfig, MCPAgentConfig } from './config.js';
import type { Tool, CallToolRequest, CallToolResult, MCPServiceMetadata } from './mcp.js';

/**
 * Agent status response
 */
export interface AgentStatusResponse {
  running: boolean;
  connected: boolean;
  xiaozhi: {
    connected: boolean;
    endpoint: string;
  };
  services: {
    total: number;
    running: number;
    stopped: number;
    error: number;
  };
  uptime: number; // seconds
}

/**
 * Service list response
 */
export interface ServiceListResponse {
  services: MCPServiceMetadata[];
}

/**
 * Service detail response
 */
export interface ServiceDetailResponse extends MCPServiceMetadata {
  config: ServiceConfig;
  tools: Tool[];
}

/**
 * Tool list response
 */
export interface ToolListResponse {
  tools: Array<Tool & { serviceId: string; serviceName: string }>;
}

/**
 * Tool call request
 */
export interface ToolCallRequestBody {
  serviceId?: string; // If omitted, auto-route based on tool name
  tool: CallToolRequest;
}

/**
 * Tool call response
 */
export interface ToolCallResponse {
  result: CallToolResult;
  executionTime: number; // milliseconds
  serviceId: string;
}

/**
 * Plugin service (for marketplace)
 */
export interface PluginService {
  id: string;
  type: 'stdio' | 'http' | 'sse';
  name: string;
  zhName: string;
  description: string;
  zhDesc: string;
  picUrl: string;
  // For SSE/HTTP
  url?: string;
  // For stdio
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Plugin category (for marketplace)
 */
export interface PluginCategory {
  category: string;
  name: string;
  zhName: string;
  description?: string;
  tags: string[];
  services: PluginService[];
}

/**
 * Plugin list response
 */
export interface PluginListResponse {
  categories: PluginCategory[];
}

/**
 * Legacy Plugin metadata (deprecated)
 */
export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  type: 'stdio' | 'http' | 'sse';
  official: boolean;
  downloads: number;
  rating: number;
  tags: string[];
  repository?: string;
  homepage?: string;
  installCommand?: string;
  config?: Partial<ServiceConfig>;
}

/**
 * Configuration update request
 */
export interface ConfigUpdateRequest {
  services?: ServiceConfig[];
  xiaozhi?: MCPAgentConfig['xiaozhi'];
  logging?: MCPAgentConfig['logging'];
}

/**
 * Log query parameters
 */
export interface LogQueryParams {
  level?: 'error' | 'warn' | 'info' | 'debug';
  serviceId?: string;
  limit?: number;
  since?: string; // ISO timestamp
}

/**
 * Log entry
 */
export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  serviceId?: string;
  serviceName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log list response
 */
export interface LogListResponse {
  logs: LogEntry[];
  hasMore: boolean;
}

/**
 * MCP Proxy Status Response
 */
export interface McpProxyStatusResponse {
  enabled: boolean;
  hasToken: boolean;
  protocol: string;
  transports: string[];
  endpoints: { sse: string };
  stats: {
    activeSessions: number;
    httpSessions: number;
    sseSessions: number;
    totalTools: number;
  };
}
