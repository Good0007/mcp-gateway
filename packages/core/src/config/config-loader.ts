/**
 * Configuration Loader
 * Loads and validates MCP Agent configuration from files
 */

import { promises as fs } from 'fs';
import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { MCPAgentConfig, validateConfig } from '../types/config.js';
import { ConfigurationError, ErrorCode } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import { RuntimeStateManager } from './runtime-state-manager.js';

/**
 * Config loader events
 */
export enum ConfigLoaderEvent {
  LOADED = 'config:loaded',
  CHANGED = 'config:changed',
  ERROR = 'config:error',
}

/**
 * Configuration Loader
 */
export class ConfigLoader extends EventEmitter {
  private config: MCPAgentConfig | null = null;
  private watcher: FSWatcher | null = null;
  private runtimeState: RuntimeStateManager;

  constructor(private readonly configPath: string, stateDir?: string) {
    super();
    // Default state directory is same as config directory
    const defaultStateDir = configPath.substring(0, configPath.lastIndexOf('/'));
    this.runtimeState = new RuntimeStateManager(stateDir || defaultStateDir);
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<MCPAgentConfig> {
    try {
      logger.info('Loading configuration', { path: this.configPath });

      // Read file
      const content = await fs.readFile(this.configPath, 'utf-8');

      // Parse JSON
      let rawConfig: unknown;
      try {
        rawConfig = JSON.parse(content);
      } catch (error) {
        throw new ConfigurationError(
          'Failed to parse configuration file as JSON',
          { path: this.configPath },
          error instanceof Error ? error : undefined
        );
      }

      // Validate with Zod
      try {
        this.config = validateConfig(rawConfig);
      } catch (error) {
        throw new ConfigurationError(
          'Configuration validation failed',
          { path: this.configPath },
          error instanceof Error ? error : undefined
        );
      }

      // Apply environment variable overrides (priority: ENV > config)
      if (process.env.MCP_ENDPOINT) {
        logger.info('Using MCP_ENDPOINT from environment variable');
        this.config.xiaozhi.endpoint = process.env.MCP_ENDPOINT;
      }

      // Validate endpoint is provided
      if (!this.config.xiaozhi.endpoint) {
        throw new ConfigurationError(
          'xiaozhi.endpoint is required (provide in config file or MCP_ENDPOINT env var)',
          { path: this.configPath }
        );
      }

      // Load runtime state and merge with config
      await this.mergeRuntimeState();

      logger.info('Configuration loaded successfully', {
        services: this.config.services.length,
        xiaozhi: this.config.xiaozhi.endpoint,
      });

      this.emit(ConfigLoaderEvent.LOADED, this.config);

      return this.config;
    } catch (error) {
      logger.error('Failed to load configuration', { error });
      this.emit(ConfigLoaderEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * Reload configuration
   */
  async reload(): Promise<MCPAgentConfig> {
    const newConfig = await this.load();
    if (this.config) {
      this.emit(ConfigLoaderEvent.CHANGED, newConfig);
    }
    return newConfig;
  }

  /**
   * Get current configuration
   */
  getConfig(): MCPAgentConfig {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded', {
        code: ErrorCode.CONFIG_NOT_FOUND,
      });
    }
    return this.config;
  }

  /**
   * Check if configuration is loaded
   */
  isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Watch configuration file for changes
   */
  watch(): void {
    if (this.watcher) {
      logger.warn('Config watcher already started');
      return;
    }

    logger.info('Starting config file watcher', { path: this.configPath });

    this.watcher = watch(this.configPath, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('change', () => {
      logger.info('Configuration file changed, reloading');
      void this.reload().catch((error: unknown) => {
        logger.error('Failed to reload configuration', { error });
      });
    });

    this.watcher.on('error', (error) => {
      logger.error('Config watcher error', { error });
      this.emit(ConfigLoaderEvent.ERROR, error);
    });
  }

  /**
   * Stop watching configuration file
   */
  async unwatch(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      logger.info('Config file watcher stopped');
    }
  }

  /**
   * Create a default configuration file
   */
  static async createDefault(path: string): Promise<void> {
    const defaultConfig: MCPAgentConfig = {
      xiaozhi: {
        endpoint: 'ws://localhost:8080/mcp',
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,
      },
      services: [],
      logging: {
        level: 'info',
      },
      resultLimit: 1024,
    };

    await fs.writeFile(path, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    logger.info('Created default configuration file', { path });
  }

  /**
   * Validate a configuration file without loading it
   */
  static async validate(path: string): Promise<boolean> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      const rawConfig = JSON.parse(content) as unknown;
      validateConfig(rawConfig);
      return true;
    } catch (error) {
      logger.error('Configuration validation failed', { path, error });
      return false;
    }
  }

  /**
   * Merge runtime state with configuration
   * Updates service enabled status from runtime state
   */
  private async mergeRuntimeState(): Promise<void> {
    if (!this.config) {
      return;
    }

    try {
      // Load runtime state
      const state = await this.runtimeState.load();

      // Merge enabled status for each service
      for (const service of this.config.services) {
        const runtimeService = state.services[service.id];
        
        if (runtimeService) {
          // Use runtime state (overrides config file)
          service.enabled = runtimeService.enabled;
          logger.debug('Applied runtime state to service', {
            serviceId: service.id,
            enabled: service.enabled,
            runtimeState: runtimeService,
          });
        } else {
          // Initialize runtime state from config
          await this.runtimeState.ensureServiceState(service.id, service.enabled);
        }
      }

      logger.info('Runtime state merged with configuration', {
        services: this.config.services.length,
        runtimeServices: Object.keys(state.services).length,
      });
    } catch (error) {
      logger.error('Failed to merge runtime state', { error });
      // Continue with config file defaults on error
    }
  }

  /**
   * Get runtime state manager
   */
  getRuntimeStateManager(): RuntimeStateManager {
    return this.runtimeState;
  }
}
