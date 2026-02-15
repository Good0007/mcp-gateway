/**
 * Configuration Type Definitions (Shared)
 * Frontend-safe versions without Zod schemas
 */

/**
 * Service type enum
 */
export enum ServiceType {
  STDIO = 'stdio',
  EMBEDDED = 'embedded',
  SSE = 'sse',
  HTTP = 'http',
}

/**
 * Base service configuration
 */
export interface BaseServiceConfig {
  id: string;
  type: ServiceType;
  name: string;
  description?: string;
  enabled: boolean;
}

/**
 * Stdio service configuration
 */
export interface StdioServiceConfig extends BaseServiceConfig {
  type: ServiceType.STDIO;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * Embedded service configuration
 */
export interface EmbeddedServiceConfig extends BaseServiceConfig {
  type: ServiceType.EMBEDDED;
  modulePath: string;
  options?: Record<string, unknown>;
}

/**
 * SSE service configuration
 */
export interface SSEServiceConfig extends BaseServiceConfig {
  type: ServiceType.SSE;
  url: string;
  headers?: Record<string, string>;
}

/**
 * HTTP service configuration
 */
export interface HTTPServiceConfig extends BaseServiceConfig {
  type: ServiceType.HTTP;
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Union type for all service configurations
 */
export type ServiceConfig =
  | StdioServiceConfig
  | EmbeddedServiceConfig
  | SSEServiceConfig
  | HTTPServiceConfig;

/**
 * Main agent configuration
 */
export interface MCPAgentConfig {
  xiaozhi: {
    endpoint?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  };
  services: ServiceConfig[];
  logging?: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    file?: string;
  };
  resultLimit?: number;
}

/**
 * Type guards
 */
export function isStdioConfig(config: ServiceConfig): config is StdioServiceConfig {
  return config.type === ServiceType.STDIO;
}

export function isEmbeddedConfig(config: ServiceConfig): config is EmbeddedServiceConfig {
  return config.type === ServiceType.EMBEDDED;
}

export function isSSEConfig(config: ServiceConfig): config is SSEServiceConfig {
  return config.type === ServiceType.SSE;
}

export function isHTTPConfig(config: ServiceConfig): config is HTTPServiceConfig {
  return config.type === ServiceType.HTTP;
}
