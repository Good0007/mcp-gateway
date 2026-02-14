/**
 * HTTP Service Adapter
 * Manages MCP services that communicate via HTTP/REST API
 */

import axios, { AxiosInstance } from 'axios';
import {
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  Tool,
} from '../types/mcp.js';
import { HTTPServiceConfig } from '../types/config.js';
import { ErrorCode, ServiceError } from '../types/errors.js';
import { BaseServiceAdapter } from './base-adapter.js';
import { logger } from '../utils/logger.js';

/**
 * HTTP adapter for REST API-based MCP services
 */
export class HTTPServiceAdapter extends BaseServiceAdapter {
  private httpClient: AxiosInstance | null = null;

  constructor(config: HTTPServiceConfig) {
    super(config);
  }

  /**
   * Get typed config
   */
  private get httpConfig(): HTTPServiceConfig {
    return this.config as HTTPServiceConfig;
  }

  /**
   * Initialize the HTTP service
   */
  protected async doInitialize(): Promise<InitializeResult> {
    const config = this.httpConfig;

    try {
      // Create HTTP client
      this.httpClient = axios.create({
        baseURL: config.baseUrl,
        headers: config.headers || {},
        timeout: config.timeout || 30000,
      });

      // Call initialize endpoint
      const response = await this.httpClient.post<InitializeResult>('/initialize', {
        protocolVersion: '2024-11-05',
        clientInfo: {
          name: 'mcp-agent',
          version: '0.1.0',
        },
        capabilities: {},
      });

      return response.data;
    } catch (error) {
      this.httpClient = null;
      logger.error('Failed to initialize HTTP service', { serviceId: config.id, error });
      throw new ServiceError(
        ErrorCode.SERVICE_INITIALIZATION_FAILED,
        config.id,
        'Failed to initialize HTTP service',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * List tools from the service
   */
  protected async doListTools(): Promise<ListToolsResult> {
    if (!this.httpClient) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        'HTTP client not initialized'
      );
    }

    try {
      const response = await this.httpClient.post<{ tools: Tool[] }>('/tools/list', {});
      return {
        tools: response.data.tools,
      };
    } catch (error) {
      logger.error('Failed to list tools', { serviceId: this.config.id, error });
      throw new ServiceError(
        ErrorCode.SERVICE_INITIALIZATION_FAILED,
        this.config.id,
        'Failed to list tools',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Call a tool
   */
  protected async doCallTool(request: CallToolRequest): Promise<CallToolResult> {
    if (!this.httpClient) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        'HTTP client not initialized'
      );
    }

    try {
      const response = await this.httpClient.post<CallToolResult>('/tools/call', {
        name: request.name,
        arguments: request.arguments,
      });

      return response.data;
    } catch (error) {
      logger.error('Tool call failed', {
        serviceId: this.config.id,
        toolName: request.name,
        error,
      });

      // Return error result instead of throwing
      return {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Close the service
   */
  protected doClose(): Promise<void> {
    if (this.httpClient) {
      // No explicit close needed for HTTP client
      // Just clear the reference
      this.httpClient = null;
    }
    return Promise.resolve();
  }
}
