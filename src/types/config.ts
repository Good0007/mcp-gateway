/**
 * Configuration Type Definitions
 * Defines all configuration structures with Zod schemas for validation
 */

import { z } from 'zod';

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
    endpoint: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  };
  services: ServiceConfig[];
  logging?: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    file?: string;
  };
  resultLimit?: number; // Max bytes for tool call results
}

/**
 * Zod validation schemas
 */

// Base service schema
const baseServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
});

// Stdio service schema
export const stdioServiceSchema = baseServiceSchema.extend({
  type: z.literal(ServiceType.STDIO),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

// Embedded service schema
export const embeddedServiceSchema = baseServiceSchema.extend({
  type: z.literal(ServiceType.EMBEDDED),
  modulePath: z.string().min(1),
  options: z.record(z.unknown()).optional(),
});

// SSE service schema
export const sseServiceSchema = baseServiceSchema.extend({
  type: z.literal(ServiceType.SSE),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});

// HTTP service schema
export const httpServiceSchema = baseServiceSchema.extend({
  type: z.literal(ServiceType.HTTP),
  baseUrl: z.string().url(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().positive().optional(),
});

// Union schema for service config
export const serviceConfigSchema = z.discriminatedUnion('type', [
  stdioServiceSchema,
  embeddedServiceSchema,
  sseServiceSchema,
  httpServiceSchema,
]);

// Main config schema
export const mcpAgentConfigSchema = z.object({
  xiaozhi: z.object({
    endpoint: z.string().url(),
    reconnectInterval: z.number().positive().default(5000),
    maxReconnectAttempts: z.number().int().positive().default(10),
  }),
  services: z.array(serviceConfigSchema),
  logging: z
    .object({
      level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
      file: z.string().optional(),
    })
    .optional(),
  resultLimit: z.number().positive().default(1024),
});

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

/**
 * Validation helper
 */
export function validateConfig(config: unknown): MCPAgentConfig {
  return mcpAgentConfigSchema.parse(config);
}
