/**
 * Error Type Definitions
 * Re-exports shared error codes + core-specific error classes
 */

// Re-export error codes and response types from shared package
export { ErrorCode, type ErrorResponse } from '@mcp-gateway/shared';

// Import for use in this file
import { ErrorCode } from '@mcp-gateway/shared';

/**
 * Base error class for MCP Agent
 */
export class MCPAgentError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly cause?: Error;

  constructor(code: ErrorCode, message: string, details?: unknown, cause?: Error) {
    super(message);
    this.name = 'MCPAgentError';
    this.code = code;
    this.details = details;
    this.cause = cause;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends MCPAgentError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super(ErrorCode.CONFIG_INVALID, message, details, cause);
    this.name = 'ConfigurationError';
  }
}

/**
 * Service error
 */
export class ServiceError extends MCPAgentError {
  public readonly serviceId: string;

  constructor(code: ErrorCode, serviceId: string, message: string, details?: unknown, cause?: Error) {
    super(code, message, details, cause);
    this.name = 'ServiceError';
    this.serviceId = serviceId;
  }
}

/**
 * Tool error
 */
export class ToolError extends MCPAgentError {
  public readonly toolName: string;

  constructor(code: ErrorCode, toolName: string, message: string, details?: unknown, cause?: Error) {
    super(code, message, details, cause);
    this.name = 'ToolError';
    this.toolName = toolName;
  }
}

/**
 * Connection error
 */
export class ConnectionError extends MCPAgentError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super(ErrorCode.CONNECTION_FAILED, message, details, cause);
    this.name = 'ConnectionError';
  }
}

/**
 * Protocol error
 */
export class ProtocolError extends MCPAgentError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super(ErrorCode.PROTOCOL_ERROR, message, details, cause);
    this.name = 'ProtocolError';
  }
}

/**
 * Type guard for MCPAgentError
 */
export function isMCPAgentError(error: unknown): error is MCPAgentError {
  return error instanceof MCPAgentError;
}

/**
 * Error factory - creates appropriate error from generic Error
 */
export function createError(error: unknown, defaultCode: ErrorCode = ErrorCode.INTERNAL_ERROR): MCPAgentError {
  if (isMCPAgentError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new MCPAgentError(defaultCode, error.message, undefined, error);
  }
  
  return new MCPAgentError(
    ErrorCode.UNKNOWN_ERROR,
    String(error)
  );
}
