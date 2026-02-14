/**
 * Service Registry Unit Tests
 */

import { ServiceRegistry, RegistryEvent } from '../../../src/core/service-registry.js';
import { ServiceConfig } from '../../../src/types/config.js';
import { MCPServiceStatus } from '../../../src/types/mcp.js';
import { ErrorCode, ServiceError } from '../../../src/types/errors.js';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  let mockConfig: ServiceConfig;

  beforeEach(() => {
    registry = new ServiceRegistry();
    mockConfig = {
      id: 'test-service',
      name: 'Test Service',
      description: 'Test service description',
      type: 'embedded',
      modulePath: './test-module.js',
      enabled: false, // Don't auto-start
    };
  });

  afterEach(async () => {
    await registry.clear();
  });

  describe('register', () => {
    it('should register a new service', async () => {
      const eventSpy = jest.fn();
      registry.on(RegistryEvent.SERVICE_REGISTERED, eventSpy);

      await registry.register(mockConfig);

      expect(registry.has('test-service')).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('test-service');
    });

    it('should throw error for duplicate registration', async () => {
      await registry.register(mockConfig);

      await expect(registry.register(mockConfig)).rejects.toThrow(ServiceError);
      await expect(registry.register(mockConfig)).rejects.toMatchObject({
        code: ErrorCode.SERVICE_ALREADY_RUNNING,
      });
    });

    it('should not auto-start if disabled', async () => {
      await registry.register(mockConfig);
      const adapter = registry.get('test-service');

      expect(adapter).toBeDefined();
      expect(adapter?.isRunning()).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should unregister a service', async () => {
      await registry.register(mockConfig);

      const eventSpy = jest.fn();
      registry.on(RegistryEvent.SERVICE_UNREGISTERED, eventSpy);

      await registry.unregister('test-service');

      expect(registry.has('test-service')).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith('test-service');
    });

    it('should throw error for non-existent service', async () => {
      await expect(registry.unregister('non-existent')).rejects.toThrow(ServiceError);
      await expect(registry.unregister('non-existent')).rejects.toMatchObject({
        code: ErrorCode.SERVICE_NOT_FOUND,
      });
    });
  });

  describe('get and has', () => {
    it('should get registered service', async () => {
      await registry.register(mockConfig);
      const adapter = registry.get('test-service');

      expect(adapter).toBeDefined();
      expect(adapter?.getMetadata().id).toBe('test-service');
    });

    it('should return undefined for non-existent service', () => {
      const adapter = registry.get('non-existent');
      expect(adapter).toBeUndefined();
    });

    it('should check if service exists', async () => {
      expect(registry.has('test-service')).toBe(false);

      await registry.register(mockConfig);
      expect(registry.has('test-service')).toBe(true);
    });
  });

  describe('getServiceIds', () => {
    it('should return empty array initially', () => {
      expect(registry.getServiceIds()).toEqual([]);
    });

    it('should return all service IDs', async () => {
      await registry.register(mockConfig);
      await registry.register({
        ...mockConfig,
        id: 'test-service-2',
        name: 'Test Service 2',
      });

      const ids = registry.getServiceIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('test-service');
      expect(ids).toContain('test-service-2');
    });
  });

  describe('getMetadata', () => {
    it('should get service metadata', async () => {
      await registry.register(mockConfig);
      const metadata = registry.getMetadata('test-service');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('test-service');
      expect(metadata?.name).toBe('Test Service');
      expect(metadata?.status).toBe(MCPServiceStatus.STOPPED);
    });

    it('should return undefined for non-existent service', () => {
      const metadata = registry.getMetadata('non-existent');
      expect(metadata).toBeUndefined();
    });
  });

  describe('getAllMetadata', () => {
    it('should return all metadata', async () => {
      await registry.register(mockConfig);
      await registry.register({
        ...mockConfig,
        id: 'test-service-2',
        name: 'Test Service 2',
      });

      const metadata = registry.getAllMetadata();
      expect(metadata).toHaveLength(2);
    });

    it('should return empty array when no services', () => {
      const metadata = registry.getAllMetadata();
      expect(metadata).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const stats = registry.getStats();

      expect(stats).toEqual({
        total: 0,
        running: 0,
        stopped: 0,
        error: 0,
        starting: 0,
      });
    });

    it('should count services by status', async () => {
      await registry.register(mockConfig);
      await registry.register({
        ...mockConfig,
        id: 'test-service-2',
        name: 'Test Service 2',
      });

      const stats = registry.getStats();
      expect(stats.total).toBe(2);
      expect(stats.stopped).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all services', async () => {
      await registry.register(mockConfig);
      await registry.register({
        ...mockConfig,
        id: 'test-service-2',
        name: 'Test Service 2',
      });

      await registry.clear();

      expect(registry.getServiceIds()).toEqual([]);
      expect(registry.getAllMetadata()).toEqual([]);
    });
  });
});
