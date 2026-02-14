/**
 * Stdio Service Adapter
 * Manages MCP services that communicate via stdio (child process)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  ToolParameter,
} from '../types/mcp.js';
import { StdioServiceConfig } from '../types/config.js';
import { ErrorCode, ServiceError } from '../types/errors.js';
import { BaseServiceAdapter } from './base-adapter.js';
import { logger } from '../utils/logger.js';

/**
 * Stdio adapter for child process-based MCP services
 */
export class StdioServiceAdapter extends BaseServiceAdapter {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(config: StdioServiceConfig) {
    super(config);
  }

  /**
   * Get typed config
   */
  private get stdioConfig(): StdioServiceConfig {
    return this.config as StdioServiceConfig;
  }

  /**
   * Initialize the stdio service
   */
  protected async doInitialize(): Promise<InitializeResult> {
    const config = this.stdioConfig;

    try {
      // Prepare environment variables (filter out undefined values)
      const env = config.env
        ? Object.fromEntries(
            Object.entries({ ...process.env, ...config.env }).filter(
              ([_, value]) => value !== undefined
            ) as [string, string][]
          )
        : undefined;

      // Create transport
      this.transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env,
      });

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
          'Failed to get server info from stdio service'
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
