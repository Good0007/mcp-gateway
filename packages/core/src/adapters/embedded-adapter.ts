/**
 * Embedded Service Adapter
 * Manages MCP services that are embedded directly in the agent process
 */

import {
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  IMCPService,
} from '../types/mcp.js';
import { EmbeddedServiceConfig } from '../types/config.js';
import { ErrorCode, ServiceError } from '../types/errors.js';
import { BaseServiceAdapter } from './base-adapter.js';
import { logger } from '../utils/logger.js';

/**
 * Module factory function type
 */
type MCPServiceFactory = (options?: Record<string, unknown>) => IMCPService | Promise<IMCPService>;

/**
 * Interface for dynamically imported module structure
 */
interface DynamicModule {
  default?: MCPServiceFactory;
  create?: MCPServiceFactory;
  createService?: MCPServiceFactory;
  factory?: MCPServiceFactory;
}

/**
 * Embedded adapter for in-process MCP services
 */
export class EmbeddedServiceAdapter extends BaseServiceAdapter {
  private service: IMCPService | null = null;

  constructor(config: EmbeddedServiceConfig) {
    super(config);
  }

  /**
   * Get typed config
   */
  private get embeddedConfig(): EmbeddedServiceConfig {
    return this.config as EmbeddedServiceConfig;
  }

  /**
   * Load the embedded module
   */
  private async loadModule(): Promise<IMCPService> {
    const config = this.embeddedConfig;

    try {
      // Dynamic import of the module with typed interface
      const module = (await import(config.modulePath)) as DynamicModule;

      // Look for factory function
      // Try common export patterns: default, create, createService, factory
      const factory: MCPServiceFactory | undefined =
        module.default || module.create || module.createService || module.factory;

      if (typeof factory !== 'function') {
        throw new ServiceError(
          ErrorCode.SERVICE_INITIALIZATION_FAILED,
          config.id,
          `Module ${config.modulePath} does not export a factory function`
        );
      }

      // Create service instance
      const service = await factory(config.options);

      // Validate that it implements IMCPService
      if (
        !service ||
        typeof service.initialize !== 'function' ||
        typeof service.listTools !== 'function' ||
        typeof service.callTool !== 'function' ||
        typeof service.close !== 'function'
      ) {
        throw new ServiceError(
          ErrorCode.SERVICE_INITIALIZATION_FAILED,
          config.id,
          `Module ${config.modulePath} does not return a valid IMCPService instance`
        );
      }

      return service;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        ErrorCode.SERVICE_INITIALIZATION_FAILED,
        config.id,
        `Failed to load embedded module: ${config.modulePath}`,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Initialize the embedded service
   */
  protected async doInitialize(onLog?: (message: string) => void): Promise<InitializeResult> {
    void onLog; // Suppress unused variable warning

    try {
      // Load the module
      this.service = await this.loadModule();

      // Initialize the service
      const result = await this.service.initialize();

      return result;
    } catch (error) {
      // Cleanup on error
      this.service = null;
      throw error;
    }
  }

  /**
   * List tools from the service
   */
  protected async doListTools(): Promise<ListToolsResult> {
    if (!this.service) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        'Service not initialized'
      );
    }

    try {
      return await this.service.listTools();
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
    if (!this.service) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        'Service not initialized'
      );
    }

    try {
      return await this.service.callTool(request);
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
    if (this.service) {
      try {
        await this.service.close();
      } catch (error) {
        logger.warn('Error closing service', { serviceId: this.config.id, error });
      }
      this.service = null;
    }
  }
}
