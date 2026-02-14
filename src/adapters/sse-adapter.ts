/**
 * SSE Service Adapter
 * Manages MCP services that communicate via Server-Sent Events (SSE)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  ToolParameter,
} from '../types/mcp.js';
import { SSEServiceConfig } from '../types/config.js';
import { ErrorCode, ServiceError } from '../types/errors.js';
import { BaseServiceAdapter } from './base-adapter.js';
import { logger } from '../utils/logger.js';

/**
 * SSE adapter for Server-Sent Events-based MCP services
 */
export class SSEServiceAdapter extends BaseServiceAdapter {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;

  constructor(config: SSEServiceConfig) {
    super(config);
  }

  /**
   * Get typed config
   */
  private get sseConfig(): SSEServiceConfig {
    return this.config as SSEServiceConfig;
  }

  /**
   * Initialize the SSE service
   */
  protected async doInitialize(): Promise<InitializeResult> {
    const config = this.sseConfig;

    try {
      // Create transport
      this.transport = new SSEClientTransport(
        new URL(config.url),
        config.headers
      );

      // Create client
      this.client = new Client(
        {
          name: 'mcp-agent',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect
      await this.client.connect(this.transport);

      // Get server info
      const serverInfo = this.client.getServerVersion();
      const capabilities = this.client.getServerCapabilities();

      if (!serverInfo) {
        throw new ServiceError(
          ErrorCode.SERVICE_INITIALIZATION_FAILED,
          config.id,
          'Failed to get server info from SSE service'
        );
      }

      return {
        protocolVersion: '2024-11-05',
        serverInfo,
        capabilities: capabilities || {},
      };
    } catch (error) {
      // Cleanup on error
      await this.cleanup();
      throw error;
    }
  }

  /**
   * List tools from the service
   */
  protected async doListTools(): Promise<ListToolsResult> {
    if (!this.client) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        'Client not initialized'
      );
    }

    try {
      const response = await this.client.listTools();
      return {
        tools: response.tools.map((tool) => ({
          name: tool.name,
          description: tool.description || '',
          parameters: (tool.inputSchema?.properties as Record<string, ToolParameter>) || {},
        })),
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
    if (!this.client) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        'Client not initialized'
      );
    }

    try {
      const response = await this.client.callTool({
        name: request.name,
        arguments: request.arguments,
      });

      // Type assertion for response
      const content = Array.isArray(response.content) ? response.content : [];

      return {
        content: content.map((item: unknown) => ({
          type: 'text' as const,
          text: typeof item === 'object' && item !== null && 'type' in item && item.type === 'text' && 'text' in item ? String(item.text) : JSON.stringify(item),
        })),
        isError: Boolean(response.isError),
      };
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
  protected async doClose(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        logger.warn('Error closing client', { serviceId: this.config.id, error });
      }
      this.client = null;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        logger.warn('Error closing transport', { serviceId: this.config.id, error });
      }
      this.transport = null;
    }
  }
}
