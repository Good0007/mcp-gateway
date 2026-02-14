/**
 * Error Type Definitions
 * Centralized error handling with error codes
 */

/**
 * Error codes for MCP Agent
 */
export enum ErrorCode {
  // Configuration errors (1xxx)
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_PARSE_ERROR = 'CONFIG_PARSE_ERROR',
  
  // Service errors (2xxx)
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  SERVICE_START_FAILED = 'SERVICE_START_FAILED',
  SERVICE_STOP_FAILED = 'SERVICE_STOP_FAILED',
  SERVICE_ALREADY_RUNNING = 'SERVICE_ALREADY_RUNNING',
  SERVICE_NOT_RUNNING = 'SERVICE_NOT_RUNNING',
  SERVICE_INITIALIZATION_FAILED = 'SERVICE_INITIALIZATION_FAILED',
  
  // Tool errors (3xxx)
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_CALL_FAILED = 'TOOL_CALL_FAILED',
  TOOL_INVALID_ARGUMENTS = 'TOOL_INVALID_ARGUMENTS',
  TOOL_RESULT_TOO_LARGE = 'TOOL_RESULT_TOO_LARGE',
  
  // Connection errors (4xxx)
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_LOST = 'CONNECTION_LOST',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  
  // Protocol errors (5xxx)
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  
  // Internal errors (9xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

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
