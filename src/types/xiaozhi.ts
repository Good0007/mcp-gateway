/**
 * Xiaozhi Protocol Type Definitions
 * Based on xiaozhi MCP WebSocket protocol
 */

import { Tool } from './mcp.js';

/**
 * Message types for xiaozhi WebSocket protocol
 */
export enum XiaozhiMessageType {
  // Client to Server
  TOOLS_LIST = 'tools/list',
  TOOLS_CALL = 'tools/call',
  PING = 'ping',
  
  // Server to Client
  TOOLS_LIST_RESULT = 'tools/list/result',
  TOOLS_CALL_RESULT = 'tools/call/result',
  TOOLS_UPDATED = 'tools/updated',
  PING_RESULT = 'ping/result',
  ERROR = 'error',
}

/**
 * Base message structure
 */
export interface XiaozhiBaseMessage {
  type: XiaozhiMessageType;
  id?: string; // Request ID for correlation
}

/**
 * Request: List all available tools
 */
export interface XiaozhiListToolsRequest extends XiaozhiBaseMessage {
  type: XiaozhiMessageType.TOOLS_LIST;
}

/**
 * Response: Tools list
 */
export interface XiaozhiListToolsResult extends XiaozhiBaseMessage {
  type: XiaozhiMessageType.TOOLS_LIST_RESULT;
  tools: Tool[];
}

/**
 * Request: Call a tool
 */
export interface XiaozhiCallToolRequest extends XiaozhiBaseMessage {
  type: XiaozhiMessageType.TOOLS_CALL;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Response: Tool call result
 */
export interface XiaozhiCallToolResult extends XiaozhiBaseMessage {
  type: XiaozhiMessageType.TOOLS_CALL_RESULT;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Notification: Tools list updated
 */
export interface XiaozhiToolsUpdatedNotification extends XiaozhiBaseMessage {
  type: XiaozhiMessageType.TOOLS_UPDATED;
}

/**
 * Request: Ping (heartbeat)
 */
export interface XiaozhiPingRequest extends XiaozhiBaseMessage {
  type: XiaozhiMessageType.PING;
  params?: Record<string, unknown>;
}

/**
 * Response: Ping result
 */
export interface XiaozhiPingResult extends XiaozhiBaseMessage {
  type: XiaozhiMessageType.PING_RESULT;
  result: Record<string, unknown>;
}

/**
 * Error message
 */
export interface XiaozhiErrorMessage extends XiaozhiBaseMessage {
  type: XiaozhiMessageType.ERROR;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Union type for all xiaozhi messages
 */
export type XiaozhiMessage =
  | XiaozhiListToolsRequest
  | XiaozhiListToolsResult
  | XiaozhiCallToolRequest
  | XiaozhiCallToolResult
  | XiaozhiToolsUpdatedNotification
  | XiaozhiPingRequest
  | XiaozhiPingResult
  | XiaozhiErrorMessage;

/**
 * Type guards
 */
export function isListToolsRequest(msg: XiaozhiMessage): msg is XiaozhiListToolsRequest {
  return msg.type === XiaozhiMessageType.TOOLS_LIST;
}

export function isCallToolRequest(msg: XiaozhiMessage): msg is XiaozhiCallToolRequest {
  return msg.type === XiaozhiMessageType.TOOLS_CALL;
}

export function isPingRequest(msg: XiaozhiMessage): msg is XiaozhiPingRequest {
  return msg.type === XiaozhiMessageType.PING;
}

export function isErrorMessage(msg: XiaozhiMessage): msg is XiaozhiErrorMessage {
  return msg.type === XiaozhiMessageType.ERROR;
}
