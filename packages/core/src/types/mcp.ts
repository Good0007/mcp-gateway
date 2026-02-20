/**
 * MCP Protocol Type Definitions
 * Re-exports shared types + core-specific extensions
 */

// Re-export all protocol types from shared package
export type {
  ToolParameter,
  Tool,
  CallToolRequest,
  CallToolResult,
  ServerInfo,
  ServerCapabilities,
  InitializeResult,
  ListToolsResult,
  MCPServiceMetadata,
} from '@mcp-gateway/shared';

export { MCPServiceStatus } from '@mcp-gateway/shared';

// Import types for use in this file
import type {
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
} from '@mcp-gateway/shared';

/**
 * Basic MCP service interface (core-specific)
 * Defines the contract for MCP service adapters
 */
export interface IMCPService {
  initialize(): Promise<InitializeResult>;
  listTools(): Promise<ListToolsResult>;
  callTool(request: CallToolRequest): Promise<CallToolResult>;
  close(): Promise<void>;
}
