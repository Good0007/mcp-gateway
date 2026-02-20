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
  /** Emitted after services have fully reloaded and tools are ready */
  TOOLS_UPDATED = 'agent:tools:updated',
}

/**
 * MCP Agent - Main orchestrator
 */
export class MCPAgent extends EventEmitter {
  private registry: ServiceRegistry;
  private xiaozhiAggregator: ToolAggregator;
  private proxyAggregator: ToolAggregator;
  private connection: XiaozhiConnection | null = null;
  private webConfigManager: WebConfigManager;
  private runtimeStateManager: RuntimeStateManager;
  private configDir: string;
  private isRunning = false;
  /** Suppress tool-change checks during initial startup */
  private isInitializing = false;
  /** Debounce timer for coalescing rapid tool-change checks (e.g. restart = stop+start) */
  private checkNotifyDebounce: NodeJS.Timeout | null = null;

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
    this.xiaozhiAggregator = new ToolAggregator(this.registry);
    this.proxyAggregator = new ToolAggregator(this.registry);
    this.webConfigManager = new WebConfigManager(this.configDir);
    this.runtimeStateManager = new RuntimeStateManager(this.configDir);

    // Setup event forwarding
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for all components.
   *
   * Design: Tool-change notifications are driven by a SINGLE method
   * `checkAndNotifyToolChanges()` that computes tool fingerprints for
   * each consumer (Xiaozhi / Proxy) independently.  This means:
   *   - Only the consumer whose tools actually changed gets notified.
   *   - Changing a service not used by either consumer triggers nothing.
   *   - A service shared by both consumers notifies both when stopped.
   *
   * Registry events (SERVICE_STARTED/STOPPED) are the primary triggers.
   * Config events (XIAOZHI_UPDATED/MCP_PROXY_UPDATED) handle filter changes.
   * SERVICE_ADDED/REMOVED/UPDATED are handled by services.ts directly;
   * mcp-agent only schedules a lightweight tool-change check as safety net.
   */
  private setupEventHandlers(): void {
    // ── Registry lifecycle events ──────────────────────────────────
    // When a service actually starts or stops, the available tools may
    // have changed.  Schedule a debounced tool-change check.
    this.registry.on(RegistryEvent.SERVICE_STARTED, (serviceId: string) => {
      logger.info('Service started', { serviceId });
      this.scheduleToolChangeCheck();
    });

    this.registry.on(RegistryEvent.SERVICE_STOPPED, (serviceId: string) => {
      logger.info('Service stopped', { serviceId });
      this.scheduleToolChangeCheck();
    });

    this.registry.on(RegistryEvent.SERVICE_ERROR, (serviceId: string, error: Error) => {
      logger.error('Service error', { serviceId, error });
      this.emit(AgentEvent.ERROR, error);
    });

    // ── Config load / save → refresh aggregator filters ───────────
    this.webConfigManager.on(WebConfigEvent.LOADED, () => {
      this.updateAggregators();
    });
    this.webConfigManager.on(WebConfigEvent.SAVED, () => {
      this.updateAggregators();
    });

    // ── Consumer filter changes ───────────────────────────────────
    // Xiaozhi / Proxy enabled-services lists changed.
    // No registry operations needed — just re-evaluate which tools
    // each consumer can see and notify if the list changed.
    this.webConfigManager.on(WebConfigEvent.XIAOZHI_UPDATED, () => {
      logger.info('Xiaozhi configuration updated, checking tool changes...');
      this.scheduleToolChangeCheck();
    });

    this.webConfigManager.on(WebConfigEvent.MCP_PROXY_UPDATED, () => {
      logger.info('MCP Proxy configuration updated, checking tool changes...');
      this.scheduleToolChangeCheck();
    });

    // ── Service config mutations (safety net) ─────────────────────
    // services.ts handles registry operations (register/unregister)
    // directly.  These handlers are a safety net: they schedule a
    // lightweight tool-change check but do NOT perform heavy reload.
    this.webConfigManager.on(WebConfigEvent.SERVICE_ADDED, () => {
      this.scheduleToolChangeCheck();
    });
    this.webConfigManager.on(WebConfigEvent.SERVICE_REMOVED, () => {
      this.scheduleToolChangeCheck();
    });
    this.webConfigManager.on(WebConfigEvent.SERVICE_UPDATED, () => {
      this.scheduleToolChangeCheck();
    });

    // ── Errors ────────────────────────────────────────────────────
    this.webConfigManager.on(WebConfigEvent.ERROR, (error: Error) => {
      logger.error('Web config error', { error });
      this.emit(AgentEvent.ERROR, error);
    });
  }

  // ================================================================
  //  Tool-change detection & notification
  // ================================================================

  /**
   * Schedule a debounced tool-change check.
   * Multiple rapid events (e.g. restart = stop + start) are coalesced
   * into a single check that runs after the dust settles.
   */
  private scheduleToolChangeCheck(): void {
    if (this.isInitializing) return;
    if (this.checkNotifyDebounce) {
      clearTimeout(this.checkNotifyDebounce);
    }
    this.checkNotifyDebounce = setTimeout(() => {
      this.checkNotifyDebounce = null;
      void this.doCheckAndNotifyToolChanges();
    }, 500);
  }

  /**
   * Core logic: independently check each consumer's tool fingerprint
   * and only notify the one(s) whose tools actually changed.
   */
  private async doCheckAndNotifyToolChanges(): Promise<void> {
    try {
      // Ensure aggregator filters reflect latest config
      this.updateAggregators();

      const xiaozhiChanged = await this.xiaozhiAggregator.snapshotAndCheckChanged();
      const proxyChanged = await this.proxyAggregator.snapshotAndCheckChanged();

      if (xiaozhiChanged && this.connection?.isConnected()) {
        logger.info('Xiaozhi tool list changed, reconnecting to refresh tools');
        await this.connection.reconnect().catch(err =>
          logger.error('Xiaozhi reconnect failed after tool change', { error: err })
        );
      }

      if (proxyChanged) {
        logger.info('Proxy tool list changed, notifying SSE/Streamable clients');
        this.emit(AgentEvent.TOOLS_UPDATED);
      }

      if (!xiaozhiChanged && !proxyChanged) {
        logger.debug('Tool lists unchanged, no notifications needed');
      }
    } catch (error) {
      logger.error('Failed to check and notify tool changes', { error });
    }
  }

  /**
   * Public: immediately check tool changes for both consumers.
   * Cancels any pending debounced check so there is no double-fire.
   */
  async checkAndNotifyToolChanges(): Promise<void> {
    if (this.checkNotifyDebounce) {
      clearTimeout(this.checkNotifyDebounce);
      this.checkNotifyDebounce = null;
    }
    await this.doCheckAndNotifyToolChanges();
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
      this.isInitializing = true;
      for (const serviceConfig of webConfig.services) {
        await this.registry.register(serviceConfig);
      }

      // Take initial tool snapshots (so subsequent checks detect real changes)
      this.updateAggregators();
      await this.xiaozhiAggregator.snapshotAndCheckChanged();
      await this.proxyAggregator.snapshotAndCheckChanged();
      this.isInitializing = false;

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
        this.xiaozhiAggregator
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
      this.isInitializing = false;
      logger.error('Failed to start agent', { error });
      this.emit(AgentEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * Reconnect to xiaozhi
   */
  async reconnect(): Promise<void> {
    if (this.connection && this.connection.isConnected()) {
      logger.info('Manual reconnection requested');
      await this.connection.reconnect();
    } else {
      logger.warn('Cannot reconnect: not connected to xiaozhi');
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
   * Get the tool aggregator for Xiaozhi
   */
  getXiaozhiAggregator(): ToolAggregator {
    return this.xiaozhiAggregator;
  }

  /**
   * Get the tool aggregator for MCP Proxy
   */
  getProxyAggregator(): ToolAggregator {
    return this.proxyAggregator;
  }

  /**
   * @deprecated Use getProxyAggregator() instead
   */
  getAggregator(): ToolAggregator {
    return this.proxyAggregator;
  }

  /**
   * Update aggregators with current config
   */
  private updateAggregators(): void {
    const config = this.webConfigManager.getConfig();
    if (!config) return;

    // Update Xiaozhi aggregator filter
    // Use optional chaining to handle missing xiaozhi section
    const xiaozhiServices = new Set(config.xiaozhi?.enabledServices);
    // If enabledServices is undefined (legacy), allow all
    const allowAllXiaozhi = !config.xiaozhi?.enabledServices;
    
    this.xiaozhiAggregator.setFilter((serviceId) => {
      if (allowAllXiaozhi) return true;
      return xiaozhiServices.has(serviceId);
    });

    // Update Proxy aggregator filter
    // Use optional chaining to handle missing mcpProxy section
    const proxyServices = new Set(config.mcpProxy?.enabledServices);
    // If enabledServices is undefined (legacy), allow all
    const allowAllProxy = !config.mcpProxy?.enabledServices;

    this.proxyAggregator.setFilter((serviceId) => {
      if (allowAllProxy) return true;
      return proxyServices.has(serviceId);
    });

    logger.info('Aggregators updated with service filters', {
      xiaozhiAllowed: allowAllXiaozhi ? 'ALL' : xiaozhiServices.size,
      proxyAllowed: allowAllProxy ? 'ALL' : proxyServices.size,
    });
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
