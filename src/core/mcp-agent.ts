/**
 * MCP Agent
 * Main agent class that orchestrates all components
 */

import { EventEmitter } from 'events';
import { ServiceRegistry, RegistryEvent } from './service-registry.js';
import { ToolAggregator } from './tool-aggregator.js';
import { XiaozhiConnection, ConnectionEvent } from './xiaozhi-connection.js';
import { ConfigLoader, ConfigLoaderEvent } from '../config/config-loader.js';
import { MCPAgentConfig } from '../types/config.js';
import { initLogger, logger } from '../utils/logger.js';

/**
 * Agent events
 */
export enum AgentEvent {
  STARTED = 'agent:started',
  STOPPED = 'agent:stopped',
  READY = 'agent:ready',
  ERROR = 'agent:error',
  CONFIG_CHANGED = 'agent:config:changed',
}

/**
 * MCP Agent - Main orchestrator
 */
export class MCPAgent extends EventEmitter {
  private registry: ServiceRegistry;
  private aggregator: ToolAggregator;
  private connection: XiaozhiConnection | null = null;
  private configLoader: ConfigLoader;
  private isRunning = false;

  constructor(configPath: string) {
    super();

    // Initialize components
    this.registry = new ServiceRegistry();
    this.aggregator = new ToolAggregator(this.registry);
    this.configLoader = new ConfigLoader(configPath);

    // Setup event forwarding
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for all components
   */
  private setupEventHandlers(): void {
    // Registry events
    this.registry.on(RegistryEvent.SERVICE_STARTED, (serviceId: string) => {
      logger.info('Service started, notifying xiaozhi', { serviceId });
      this.connection?.notifyToolsUpdated();
    });

    this.registry.on(RegistryEvent.SERVICE_STOPPED, (serviceId: string) => {
      logger.info('Service stopped, notifying xiaozhi', { serviceId });
      this.connection?.notifyToolsUpdated();
    });

    this.registry.on(RegistryEvent.SERVICE_ERROR, (serviceId: string, error: Error) => {
      logger.error('Service error', { serviceId, error });
      this.emit(AgentEvent.ERROR, error);
    });

    // Config loader events
    this.configLoader.on(ConfigLoaderEvent.CHANGED, (config: MCPAgentConfig) => {
      logger.info('Configuration changed, applying updates');
      void this.applyConfigChanges(config)
        .then(() => {
          this.emit(AgentEvent.CONFIG_CHANGED, config);
        })
        .catch((error: unknown) => {
          logger.error('Failed to apply config changes', { error });
          this.emit(AgentEvent.ERROR, error);
        });
    });

    this.configLoader.on(ConfigLoaderEvent.ERROR, (error: Error) => {
      logger.error('Config loader error', { error });
      this.emit(AgentEvent.ERROR, error);
    });
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Agent is already running');
      return;
    }

    try {
      logger.info('Starting MCP Agent');

      // Load configuration
      const config = await this.configLoader.load();

      // Initialize logger with config
      if (config.logging) {
        initLogger({
          level: config.logging.level,
          file: config.logging.file,
        });
      }

      // Register all services
      for (const serviceConfig of config.services) {
        await this.registry.register(serviceConfig);
      }

      // Create connection to xiaozhi
      this.connection = new XiaozhiConnection(
        {
          endpoint: config.xiaozhi.endpoint,
          reconnectInterval: config.xiaozhi.reconnectInterval,
          maxReconnectAttempts: config.xiaozhi.maxReconnectAttempts,
        },
        this.aggregator
      );

      // Setup connection events
      this.connection.on(ConnectionEvent.CONNECTED, () => {
        logger.info('Connected to xiaozhi, agent ready');
        this.emit(AgentEvent.READY);
      });

      this.connection.on(ConnectionEvent.DISCONNECTED, () => {
        logger.warn('Disconnected from xiaozhi');
      });

      this.connection.on(ConnectionEvent.ERROR, (error: Error) => {
        logger.error('Connection error', { error });
        this.emit(AgentEvent.ERROR, error);
      });

      // Connect to xiaozhi
      await this.connection.connect();

      // Start config file watcher
      this.configLoader.watch();

      this.isRunning = true;
      this.emit(AgentEvent.STARTED);

      logger.info('MCP Agent started successfully', {
        services: this.registry.getServiceIds().length,
        xiaozhi: config.xiaozhi.endpoint,
      });
    } catch (error) {
      logger.error('Failed to start agent', { error });
      this.emit(AgentEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Agent is not running');
      return;
    }

    try {
      logger.info('Stopping MCP Agent');

      // Stop config watcher
      await this.configLoader.unwatch();

      // Disconnect from xiaozhi
      if (this.connection) {
        await this.connection.disconnect();
        this.connection = null;
      }

      // Stop all services
      await this.registry.stopAll();

      // Clear registry
      await this.registry.clear();

      this.isRunning = false;
      this.emit(AgentEvent.STOPPED);

      logger.info('MCP Agent stopped');
    } catch (error) {
      logger.error('Error stopping agent', { error });
      this.emit(AgentEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * Restart the agent
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Apply configuration changes (hot reload)
   */
  private async applyConfigChanges(newConfig: MCPAgentConfig): Promise<void> {
    // Update logger
    if (newConfig.logging) {
      initLogger({
        level: newConfig.logging.level,
        file: newConfig.logging.file,
      });
    }

    // Get current service IDs
    const currentIds = new Set(this.registry.getServiceIds());
    const newIds = new Set(newConfig.services.map((s) => s.id));

    // Remove services that no longer exist
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        logger.info('Removing service from config', { id });
        await this.registry.unregister(id);
      }
    }

    // Add or update services
    for (const serviceConfig of newConfig.services) {
      if (currentIds.has(serviceConfig.id)) {
        // Service exists - restart if config changed
        logger.info('Updating service', { id: serviceConfig.id });
        await this.registry.unregister(serviceConfig.id);
        await this.registry.register(serviceConfig);
      } else {
        // New service - register it
        logger.info('Adding new service', { id: serviceConfig.id });
        await this.registry.register(serviceConfig);
      }
    }

    // Notify xiaozhi of tools change
    this.connection?.notifyToolsUpdated();
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      running: this.isRunning,
      connected: this.connection?.isConnected() || false,
      services: this.registry.getStats(),
      config: this.configLoader.isLoaded(),
    };
  }

  /**
   * Get service registry
   */
  getRegistry(): ServiceRegistry {
    return this.registry;
  }

  /**
   * Get tool aggregator
   */
  getAggregator(): ToolAggregator {
    return this.aggregator;
  }

  /**
   * Get connection
   */
  getConnection(): XiaozhiConnection | null {
    return this.connection;
  }

  /**
   * Get configuration
   */
  getConfig(): MCPAgentConfig {
    return this.configLoader.getConfig();
  }
}
