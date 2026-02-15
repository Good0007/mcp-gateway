/**
 * Base Service Adapter
 * Abstract base class for all MCP service adapters
 */

import {
  IMCPService,
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  MCPServiceStatus,
  MCPServiceMetadata,
} from '../types/mcp.js';
import { ServiceConfig } from '../types/config.js';
import { ErrorCode, ServiceError } from '../types/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Abstract base adapter implementing common lifecycle management
 */
export abstract class BaseServiceAdapter implements IMCPService {
  protected status: MCPServiceStatus = MCPServiceStatus.STOPPED;
  protected initResult: InitializeResult | null = null;
  protected tools: ListToolsResult | null = null;

  constructor(protected readonly config: ServiceConfig) {}

  /**
   * Get service metadata
   */
  getMetadata(): MCPServiceMetadata {
    return {
      id: this.config.id,
      name: this.config.name,
      description: this.config.description,
      status: this.status,
      serverInfo: this.initResult?.serverInfo,
      capabilities: this.initResult?.capabilities,
    };
  }

  /**
   * Get current status
   */
  getStatus(): MCPServiceStatus {
    return this.status;
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.status === MCPServiceStatus.RUNNING;
  }

  /**
   * Ensure service is running
   */
  protected assertRunning(): void {
    if (!this.isRunning()) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        `Service ${this.config.name} is not running`
      );
    }
  }

  /**
   * Initialize the service
   * Subclasses must implement the actual initialization logic
   */
  async initialize(): Promise<InitializeResult> {
    if (this.status === MCPServiceStatus.RUNNING) {
      throw new ServiceError(
        ErrorCode.SERVICE_ALREADY_RUNNING,
        this.config.id,
        `Service ${this.config.name} is already running`
      );
    }

    try {
      this.status = MCPServiceStatus.STARTING;
      logger.info(`Initializing service: ${this.config.name}`, { id: this.config.id });

      // Call subclass implementation
      this.initResult = await this.doInitialize();

      // Cache tools list
      this.tools = await this.doListTools();

      this.status = MCPServiceStatus.RUNNING;
      logger.info(`Service initialized: ${this.config.name}`, {
        id: this.config.id,
        toolCount: this.tools.tools.length,
      });

      return this.initResult;
    } catch (error) {
      this.status = MCPServiceStatus.ERROR;
      const serviceError = new ServiceError(
        ErrorCode.SERVICE_INITIALIZATION_FAILED,
        this.config.id,
        `Failed to initialize service ${this.config.name}`,
        undefined,
        error instanceof Error ? error : undefined
      );
      logger.error(serviceError.message, { error });
      throw serviceError;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<ListToolsResult> {
    this.assertRunning();

    // Return cached tools if available
    if (this.tools) {
      return this.tools;
    }

    // Fetch and cache tools
    this.tools = await this.doListTools();
    return this.tools;
  }

  /**
   * Call a tool
   */
  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    this.assertRunning();

    try {
      logger.debug(`Calling tool: ${request.name}`, {
        serviceId: this.config.id,
        arguments: request.arguments,
      });

      const result = await this.doCallTool(request);

      logger.debug(`Tool call completed: ${request.name}`, {
        serviceId: this.config.id,
        isError: result.isError,
      });

      return result;
    } catch (error) {
      logger.error(`Tool call failed: ${request.name}`, {
        serviceId: this.config.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    if (this.status === MCPServiceStatus.STOPPED) {
      return;
    }

    try {
      logger.info(`Closing service: ${this.config.name}`, { id: this.config.id });

      await this.doClose();

      this.status = MCPServiceStatus.STOPPED;
      this.initResult = null;
      this.tools = null;

      logger.info(`Service closed: ${this.config.name}`, { id: this.config.id });
    } catch (error) {
      const serviceError = new ServiceError(
        ErrorCode.SERVICE_STOP_FAILED,
        this.config.id,
        `Failed to close service ${this.config.name}`,
        undefined,
        error instanceof Error ? error : undefined
      );
      logger.error(serviceError.message, { error });
      throw serviceError;
    }
  }

  /**
   * Refresh tools list (invalidate cache)
   */
  async refreshTools(): Promise<ListToolsResult> {
    this.assertRunning();
    this.tools = await this.doListTools();
    return this.tools;
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Initialize the underlying service
   */
  protected abstract doInitialize(): Promise<InitializeResult>;

  /**
   * List tools from the underlying service
   */
  protected abstract doListTools(): Promise<ListToolsResult>;

  /**
   * Call a tool on the underlying service
   */
  protected abstract doCallTool(request: CallToolRequest): Promise<CallToolResult>;

  /**
   * Close/cleanup the underlying service
   */
  protected abstract doClose(): Promise<void>;
}
