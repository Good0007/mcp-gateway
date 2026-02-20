/**
 * MCP Protocol Type Definitions (Shared)
 */

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
}

/**
 * Tool definition
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
}

/**
 * Request to call a tool
 */
export interface CallToolRequest {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result from a tool call
 */
export interface CallToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * MCP Server information
 */
export interface ServerInfo {
  name: string;
  version: string;
}

/**
 * MCP Protocol capabilities
 */
export interface ServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

/**
 * MCP initialization result
 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: ServerInfo;
}

/**
 * MCP list tools result
 */
export interface ListToolsResult {
  tools: Tool[];
}

/**
 * MCP service status
 */
export enum MCPServiceStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  ERROR = 'error',
}

/**
 * MCP service metadata (for GUI display)
 */
export interface MCPServiceMetadata {
  id: string;
  name: string;
  description?: string;
  type?: 'stdio' | 'embedded' | 'sse' | 'http';
  status: MCPServiceStatus;
  serverInfo?: ServerInfo;
  capabilities?: ServerCapabilities;
  error?: string;
  toolCount?: number;
  lastStarted?: string; // ISO timestamp
  lastError?: string;
}
