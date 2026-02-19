/**
 * Service Registry
 * Manages registration, lifecycle, and discovery of MCP services
 */

import { EventEmitter } from 'events';
import {
  ServiceConfig,
  isStdioConfig,
  isEmbeddedConfig,
  isSSEConfig,
  isHTTPConfig,
} from '../types/config.js';
import { MCPServiceMetadata, MCPServiceStatus } from '../types/mcp.js';
import { ErrorCode, ServiceError } from '../types/errors.js';
import { BaseServiceAdapter } from '../adapters/base-adapter.js';
import { StdioServiceAdapter } from '../adapters/stdio-adapter.js';
import { EmbeddedServiceAdapter } from '../adapters/embedded-adapter.js';
import { SSEServiceAdapter } from '../adapters/sse-adapter.js';
import { HTTPServiceAdapter } from '../adapters/http-adapter.js';
import { RuntimeStateManager } from '../config/runtime-state-manager.js';
import { logger } from '../utils/logger.js';

/**
 * Registry events
 */
export enum RegistryEvent {
  SERVICE_REGISTERED = 'service:registered',
  SERVICE_UNREGISTERED = 'service:unregistered',
  SERVICE_STARTED = 'service:started',
  SERVICE_STOPPED = 'service:stopped',
  SERVICE_ERROR = 'service:error',
}

/**
 * Service Registry - manages all MCP service adapters
 */
export class ServiceRegistry extends EventEmitter {
  private services = new Map<string, BaseServiceAdapter>();
  private runtimeState?: RuntimeStateManager;

  /**
   * Set runtime state manager (optional)
   */
  setRuntimeStateManager(runtimeState: RuntimeStateManager): void {
    this.runtimeState = runtimeState;
    logger.debug('Runtime state manager attached to service registry');
  }

  /**
   * Create adapter for a service configuration
   */
  private createAdapter(config: ServiceConfig): BaseServiceAdapter {
    if (isStdioConfig(config)) {
      return new StdioServiceAdapter(config);
    }
    if (isEmbeddedConfig(config)) {
      return new EmbeddedServiceAdapter(config);
    }
    if (isSSEConfig(config)) {
      return new SSEServiceAdapter(config);
    }
    if (isHTTPConfig(config)) {
      return new HTTPServiceAdapter(config);
    }

    // This should never happen due to discriminated union
    const unknownConfig = config as ServiceConfig;
    throw new ServiceError(
      ErrorCode.CONFIG_INVALID,
      unknownConfig.id,
      `Unsupported service type: ${String((unknownConfig as { type?: string }).type)}`
    );
  }

  /**
   * Register a new service
   */
  async register(config: ServiceConfig): Promise<void> {
    if (this.services.has(config.id)) {
      throw new ServiceError(
        ErrorCode.SERVICE_ALREADY_RUNNING,
        config.id,
        `Service with id ${config.id} is already registered`
      );
    }

    logger.info(`Registering service: ${config.name}`, { id: config.id, type: config.type });

    const adapter = this.createAdapter(config);
    this.services.set(config.id, adapter);

    this.emit(RegistryEvent.SERVICE_REGISTERED, config.id);

    // Auto-start if enabled
    if (config.enabled) {
      try {
        await this.start(config.id);
      } catch (error) {
        // Log error but don't fail registration
        // The service will be in ERROR state which is fine
        logger.error(`Failed to auto-start service ${config.id}`, { error });
      }
    }
  }

  /**
   * Unregister a service
   */
  async unregister(serviceId: string): Promise<void> {
    const adapter = this.services.get(serviceId);
    if (!adapter) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_FOUND,
        serviceId,
        `Service ${serviceId} not found`
      );
    }

    // Stop if running
    if (adapter.isRunning()) {
      await this.stop(serviceId);
    }

    this.services.delete(serviceId);
    this.emit(RegistryEvent.SERVICE_UNREGISTERED, serviceId);

    logger.info(`Service unregistered: ${serviceId}`);
  }

  /**
   * Start a service
   */
  async start(serviceId: string, onLog?: (message: string) => void): Promise<void> {
    const adapter = this.services.get(serviceId);
    if (!adapter) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_FOUND,
        serviceId,
        `Service ${serviceId} not found`
      );
    }

    try {
      await adapter.initialize(onLog);
      
      // Update runtime state
      if (this.runtimeState) {
        await this.runtimeState.updateServiceEnabled(serviceId, true);
      }
      
      this.emit(RegistryEvent.SERVICE_STARTED, serviceId);
      logger.info(`Service started: ${serviceId}`);
    } catch (error) {
      this.emit(RegistryEvent.SERVICE_ERROR, serviceId, error);
      throw error;
    }
  }

  /**
   * Stop a service
   */
  async stop(serviceId: string): Promise<void> {
    const adapter = this.services.get(serviceId);
    if (!adapter) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_FOUND,
        serviceId,
        `Service ${serviceId} not found`
      );
    }

    try {
      await adapter.close();
      
      // Update runtime state
      if (this.runtimeState) {
        await this.runtimeState.updateServiceEnabled(serviceId, false);
      }
      
      this.emit(RegistryEvent.SERVICE_STOPPED, serviceId);
      logger.info(`Service stopped: ${serviceId}`);
    } catch (error) {
      this.emit(RegistryEvent.SERVICE_ERROR, serviceId, error);
      throw error;
    }
  }

  /**
   * Restart a service
   */
  async restart(serviceId: string): Promise<void> {
    await this.stop(serviceId);
    await this.start(serviceId);
  }

  /**
   * Get a service adapter
   */
  get(serviceId: string): BaseServiceAdapter | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Check if service exists
   */
  has(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  /**
   * Get all service IDs
   */
  getServiceIds(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get all running services
   */
  getRunningServices(): BaseServiceAdapter[] {
    return Array.from(this.services.values()).filter((adapter) => adapter.isRunning());
  }

  /**
   * Get service metadata
   */
  getMetadata(serviceId: string): MCPServiceMetadata | undefined {
    const adapter = this.services.get(serviceId);
    return adapter?.getMetadata();
  }

  /**
   * Get all services metadata
   */
  getAllMetadata(): MCPServiceMetadata[] {
    return Array.from(this.services.values()).map((adapter) => adapter.getMetadata());
  }

  /**
   * Get services by status
   */
  getServicesByStatus(status: MCPServiceStatus): BaseServiceAdapter[] {
    return Array.from(this.services.values()).filter(
      (adapter) => adapter.getStatus() === status
    );
  }

  /**
   * Start all registered services that are enabled
   */
  async startAll(): Promise<void> {
    const startPromises = this.getServiceIds().map(async (serviceId) => {
      const adapter = this.services.get(serviceId);
      if (adapter && !adapter.isRunning()) {
        try {
          await this.start(serviceId);
        } catch (error) {
          logger.error(`Failed to start service: ${serviceId}`, { error });
        }
      }
    });

    await Promise.all(startPromises);
  }

  /**
   * Stop all running services
   */
  async stopAll(): Promise<void> {
    const stopPromises = this.getRunningServices().map(async (adapter) => {
      const serviceId = adapter.getMetadata().id;
      try {
        await this.stop(serviceId);
      } catch (error) {
        logger.error(`Failed to stop service: ${serviceId}`, { error });
      }
    });

    await Promise.all(stopPromises);
  }

  /**
   * Clear all services
   */
  async clear(): Promise<void> {
    await this.stopAll();
    this.services.clear();
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const all = this.getAllMetadata();
    return {
      total: all.length,
      running: all.filter((m) => m.status === MCPServiceStatus.RUNNING).length,
      stopped: all.filter((m) => m.status === MCPServiceStatus.STOPPED).length,
      error: all.filter((m) => m.status === MCPServiceStatus.ERROR).length,
      starting: all.filter((m) => m.status === MCPServiceStatus.STARTING).length,
    };
  }
}
