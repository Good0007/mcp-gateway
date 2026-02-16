/**
 * MCP Protocol Type Definitions
 * Based on Model Context Protocol specification
 */

/**
 * Tool parameter definition - describes an input parameter
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, ToolParameter>; // For object type
  items?: ToolParameter; // For array type
}

/**
 * Tool definition - describes a callable tool/function
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
 * Basic MCP service interface
 */
export interface IMCPService {
  initialize(): Promise<InitializeResult>;
  listTools(): Promise<ListToolsResult>;
  callTool(request: CallToolRequest): Promise<CallToolResult>;
  close(): Promise<void>;
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
 * MCP service metadata
 */
export interface MCPServiceMetadata {
  id: string;
  name: string;
  description?: string;
  status: MCPServiceStatus;
  serverInfo?: ServerInfo;
  capabilities?: ServerCapabilities;
  error?: string;
  type?: 'stdio' | 'embedded' | 'sse' | 'http';
  toolCount?: number;
}
