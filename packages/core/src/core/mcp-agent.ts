/**
 * MCP Agent
 * Main agent class that orchestrates all components
 */

import { EventEmitter } from 'events';
import { ServiceRegistry, RegistryEvent } from './service-registry.js';
import { ToolAggregator } from './tool-aggregator.js';
import { XiaozhiConnection, ConnectionEvent } from './xiaozhi-connection.js';
import { WebConfigManager, WebConfigEvent } from '../config/web-config-manager.js';
import { RuntimeStateManager } from '../config/runtime-state-manager.js';
import { initLogger, logger } from '../utils/logger.js';
import path from 'path';

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
  private webConfigManager: WebConfigManager;
  private runtimeStateManager: RuntimeStateManager;
  private configDir: string;
  private isRunning = false;

  /**
   * Create MCP Agent instance
   * @param configDirOrPath - Config directory path, or legacy config file path (auto-detected)
   */
  constructor(configDirOrPath: string) {
    super();

    // Auto-detect if this is a file path or directory
    // Legacy: /path/to/agent-config.json -> use /path/to as configDir
    // New: /path/to/config -> use as configDir directly
    if (configDirOrPath.endsWith('.json')) {
      // Legacy file path
      this.configDir = path.dirname(configDirOrPath);
      logger.info('Detected legacy config file path, using directory', { configDir: this.configDir });
    } else {
      // Modern directory path
      this.configDir = configDirOrPath;
    }

    // Initialize components
    this.registry = new ServiceRegistry();
    this.aggregator = new ToolAggregator(this.registry);
    this.webConfigManager = new WebConfigManager(this.configDir);
    this.runtimeStateManager = new RuntimeStateManager(this.configDir);

    // Setup event forwarding
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for all components
   */
  private setupEventHandlers(): void {
    // Registry events
    this.registry.on(RegistryEvent.SERVICE_STARTED, (serviceId: string) => {
      logger.info('Service started', { serviceId });
      // Note: Tools change notifications handled by config reload reconnection
      // For standard MCP support: void this.connection?.notifyToolsUpdated();
    });

    this.registry.on(RegistryEvent.SERVICE_STOPPED, (serviceId: string) => {
      logger.info('Service stopped', { serviceId });
      // Note: Tools change notifications handled by config reload reconnection
      // For standard MCP support: void this.connection?.notifyToolsUpdated();
    });

    this.registry.on(RegistryEvent.SERVICE_ERROR, (serviceId: string, error: Error) => {
      logger.error('Service error', { serviceId, error });
      this.emit(AgentEvent.ERROR, error);
    });

    // Web config events
    this.webConfigManager.on(WebConfigEvent.SERVICE_ADDED, () => {
      logger.info('Service added via Web UI, reloading...');
      void this.reloadServices();
    });

    this.webConfigManager.on(WebConfigEvent.SERVICE_REMOVED, () => {
      logger.info('Service removed via Web UI, reloading...');
      void this.reloadServices();
    });

    this.webConfigManager.on(WebConfigEvent.ERROR, (error: Error) => {
      logger.error('Web config error', { error });
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

      // Load web configuration (unified config source)
      const webConfig = await this.webConfigManager.load();
      logger.info('Configuration loaded', { 
        services: webConfig.services.length,
        endpoints: webConfig.xiaozhi.endpoints.length,
      });

      // Initialize logger with preferences
      const prefs = webConfig.preferences;
      if (prefs.logging) {
        initLogger({
          level: prefs.logging.level || 'info',
          file: prefs.logging.file,
        });
      }

      // Load runtime state
      await this.runtimeStateManager.load();

      // Attach runtime state manager to registry
      this.registry.setRuntimeStateManager(this.runtimeStateManager);

      // Register all services from web config
      for (const serviceConfig of webConfig.services) {
        await this.registry.register(serviceConfig);
      }

      // Get current endpoint
      const currentEndpoint = this.webConfigManager.getCurrentEndpoint();
      if (!currentEndpoint) {
        logger.warn('No Xiaozhi endpoint configured. The agent will start without xiaozhi connection.');
        logger.warn('Please configure an endpoint through the Web UI to enable xiaozhi integration.');
        
        // Mark as running even without xiaozhi connection
        this.isRunning = true;
        this.emit(AgentEvent.STARTED);
        
        logger.info('MCP Agent started in limited mode', {
          services: this.registry.getServiceIds().length,
          endpoint: 'none',
        });
        return;
      }

      // Create connection to xiaozhi
      this.connection = new XiaozhiConnection(
        {
          endpoint: currentEndpoint.url,
          reconnectInterval: prefs.reconnectInterval || 5000,
          maxReconnectAttempts: prefs.maxReconnectAttempts || 10,
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

      this.isRunning = true;
      this.emit(AgentEvent.STARTED);

      logger.info('MCP Agent started successfully', {
        services: this.registry.getServiceIds().length,
        endpoint: currentEndpoint.name,
      });
    } catch (error) {
      logger.error('Failed to start agent', { error });
      this.emit(AgentEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * Reload services from configuration
   */
  private async reloadServices(): Promise<void> {
    try {
      const webConfig = await this.webConfigManager.load();
      
      // Get current service IDs
      const currentIds = new Set(this.registry.getServiceIds());
      const newIds = new Set(webConfig.services.map(s => s.id));

      // Remove services that are no longer in config
      for (const id of currentIds) {
        if (!newIds.has(id)) {
          logger.info('Removing service no longer in config', { id });
          await this.registry.unregister(id);
        }
      }

      // Add or update services
      for (const serviceConfig of webConfig.services) {
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

      // Reconnect to xiaozhi to refresh tool list
      if (this.connection?.isConnected()) {
        logger.info('Configuration changed, reconnecting to xiaozhi to refresh tools');
        await this.connection.reconnect();
      }
    } catch (error) {
      logger.error('Failed to reload services', { error });
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
   * Get agent status
   */
  getStatus() {
    const webConfig = this.webConfigManager.getConfig();
    return {
      running: this.isRunning,
      connected: this.connection?.isConnected() || false,
      services: this.registry.getStats(),
      configLoaded: webConfig !== null,
      servicesCount: webConfig?.services.length || 0,
      endpointsCount: webConfig?.xiaozhi.endpoints.length || 0,
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
   * Get web configuration manager
   * 
   * Use this to access the unified configuration:
   * - webConfigManager.getServices() - Get service configurations
   * - webConfigManager.getEndpoints() - Get Xiaozhi endpoints
   * - webConfigManager.getPreferences() - Get preferences
   * - webConfigManager.getConfig() - Get full config object
   */
  getWebConfigManager(): WebConfigManager {
    return this.webConfigManager;
  }

  /**
   * Get runtime state manager
   */
  getRuntimeStateManager(): RuntimeStateManager {
    return this.runtimeStateManager;
  }
}
