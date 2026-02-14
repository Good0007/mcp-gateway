/**
 * MCP (Model Context Protocol) Standard Protocol Types
 * Based on MCP specification using JSON-RPC 2.0
 * Specification: https://spec.modelcontextprotocol.io/
 */

import { Tool } from './mcp.js';

/**
 * JSON-RPC 2.0 Request ID
 */
export type RequestId = string | number;

/**
 * JSON-RPC 2.0 Request
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: RequestId;
  method: string;
  params?: Record<string, unknown> | unknown[];
}

/**
 * JSON-RPC 2.0 Response
 */
export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: RequestId;
  result: unknown;
}

/**
 * JSON-RPC 2.0 Error Object
 */
export interface JSONRPCError {
  jsonrpc: '2.0';
  id: RequestId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * JSON-RPC 2.0 Notification (no id, no response expected)
 */
export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown> | unknown[];
}

/**
 * Union type for all JSON-RPC messages
 */
export type JSONRPCMessage = JSONRPCRequest | JSONRPCResponse | JSONRPCError | JSONRPCNotification;

// =============================================================================
// MCP Protocol Constants
// =============================================================================

/**
 * Standard JSON-RPC error codes
 */
export const ErrorCode = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // MCP-specific errors
  CONNECTION_CLOSED: -32000,
  REQUEST_TIMEOUT: -32001,
} as const;

// =============================================================================
// MCP Initialize Protocol
// =============================================================================

/**
 * Client capabilities
 */
export interface ClientCapabilities {
  experimental?: Record<string, unknown>;
  sampling?: Record<string, unknown>;
  roots?: {
    listChanged?: boolean;
  };
}

/**
 * Server capabilities
 */
export interface ServerCapabilities {
  experimental?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

/**
 * Implementation info
 */
export interface Implementation {
  name: string;
  version: string;
}

/**
 * Initialize request params
 */
export interface InitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: Implementation;
}

/**
 * Initialize result
 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
  instructions?: string;
}

// =============================================================================
// MCP Ping Protocol
// =============================================================================

/**
 * Ping request params (empty)
 */
export type PingParams = Record<string, never>;

/**
 * Ping result (empty)
 */
export type PingResult = Record<string, never>;

// =============================================================================
// MCP Tools Protocol
// =============================================================================

/**
 * List tools request params
 */
export interface ListToolsParams {
  cursor?: string;
}

/**
 * List tools result
 */
export interface ListToolsResult {
  tools: Tool[];
  nextCursor?: string;
}

/**
 * Call tool request params
 */
export interface CallToolParams {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * Tool call result content
 */
export interface ToolCallContent {
  type: 'text';
  text: string;
}

/**
 * Call tool result
 */
export interface CallToolResult {
  content: ToolCallContent[];
  isError?: boolean;
}

// =============================================================================
// MCP Notifications
// =============================================================================

/**
 * Initialized notification params (empty)
 */
export type InitializedParams = Record<string, never>;

/**
 * Tools list changed notification params (empty)
 */
export type ToolsListChangedParams = Record<string, never>;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if message is a request
 */
export function isRequest(msg: JSONRPCMessage): msg is JSONRPCRequest {
  return 'id' in msg && 'method' in msg && !('result' in msg) && !('error' in msg);
}

/**
 * Check if message is a response
 */
export function isResponse(msg: JSONRPCMessage): msg is JSONRPCResponse {
  return 'id' in msg && 'result' in msg;
}

/**
 * Check if message is an error
 */
export function isError(msg: JSONRPCMessage): msg is JSONRPCError {
  return 'id' in msg && 'error' in msg;
}

/**
 * Check if message is a notification
 */
export function isNotification(msg: JSONRPCMessage): msg is JSONRPCNotification {
  return !('id' in msg) && 'method' in msg;
}

/**
 * Check if request is initialize
 */
export function isInitializeRequest(msg: JSONRPCMessage): msg is JSONRPCRequest {
  return isRequest(msg) && msg.method === 'initialize';
}

/**
 * Check if request is ping
 */
export function isPingRequest(msg: JSONRPCMessage): msg is JSONRPCRequest {
  return isRequest(msg) && msg.method === 'ping';
}

/**
 * Check if request is tools/list
 */
export function isListToolsRequest(msg: JSONRPCMessage): msg is JSONRPCRequest {
  return isRequest(msg) && msg.method === 'tools/list';
}

/**
 * Check if request is tools/call
 */
export function isCallToolRequest(msg: JSONRPCMessage): msg is JSONRPCRequest {
  return isRequest(msg) && msg.method === 'tools/call';
}

/**
 * Check if notification is initialized
 */
export function isInitializedNotification(msg: JSONRPCMessage): msg is JSONRPCNotification {
  return isNotification(msg) && msg.method === 'notifications/initialized';
}
