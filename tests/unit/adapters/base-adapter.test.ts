/**
 * Base Service Adapter Unit Tests
 */

import { BaseServiceAdapter } from '../../../src/adapters/base-adapter.js';
import {
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  MCPServiceStatus,
} from '../../../src/types/mcp.js';
import { ServiceConfig } from '../../../src/types/config.js';
import { ErrorCode, ServiceError } from '../../../src/types/errors.js';

/**
 * Mock adapter for testing BaseServiceAdapter
 */
class MockAdapter extends BaseServiceAdapter {
  public doInitializeCalled = false;
  public doListToolsCalled = false;
  public doCallToolCalled = false;
  public doCloseCalled = false;

  constructor(config: ServiceConfig) {
    super(config);
  }

  protected async doInitialize(): Promise<InitializeResult> {
    this.doInitializeCalled = true;
    return {
      protocolVersion: '1.0.0',
      serverInfo: {
        name: 'Mock Service',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
      },
    };
  }

  protected async doListTools(): Promise<ListToolsResult> {
    this.doListToolsCalled = true;
    return {
      tools: [
        {
          name: 'test-tool',
          description: 'Test tool',
          parameters: {},
        },
      ],
    };
  }

  protected async doCallTool(request: CallToolRequest): Promise<CallToolResult> {
    this.doCallToolCalled = true;
    return {
      content: [
        {
          type: 'text',
          text: `Called ${request.name} with ${JSON.stringify(request.arguments)}`,
        },
      ],
    };
  }

  protected async doClose(): Promise<void> {
    this.doCloseCalled = true;
  }
}

describe('BaseServiceAdapter', () => {
  let mockConfig: ServiceConfig;
  let adapter: MockAdapter;

  beforeEach(() => {
    mockConfig = {
      id: 'test-service',
      name: 'Test Service',
      description: 'A test service',
      type: 'stdio',
      command: 'test',
      args: [],
    };
    adapter = new MockAdapter(mockConfig);
  });

  afterEach(async () => {
    if (adapter.isRunning()) {
      await adapter.close();
    }
  });

  describe('initialization', () => {
    it('should start in STOPPED status', () => {
      expect(adapter.getStatus()).toBe(MCPServiceStatus.STOPPED);
      expect(adapter.isRunning()).toBe(false);
    });

    it('should initialize successfully', async () => {
      const result = await adapter.initialize();
      
      expect(adapter.doInitializeCalled).toBe(true);
      expect(adapter.doListToolsCalled).toBe(true);
      expect(adapter.getStatus()).toBe(MCPServiceStatus.RUNNING);
      expect(adapter.isRunning()).toBe(true);
      expect(result.protocolVersion).toBe('1.0.0');
    });

    it('should throw error if already running', async () => {
      await adapter.initialize();
      
      await expect(adapter.initialize()).rejects.toThrow(ServiceError);
      await expect(adapter.initialize()).rejects.toMatchObject({
        code: ErrorCode.SERVICE_ALREADY_RUNNING,
      });
    });

    it('should cache initialization result', async () => {
      await adapter.initialize();
      const metadata = adapter.getMetadata();
      
      expect(metadata.serverInfo).toBeDefined();
      expect(metadata.serverInfo?.name).toBe('Mock Service');
    });
  });

  describe('listTools', () => {
    it('should throw error if not running', async () => {
      await expect(adapter.listTools()).rejects.toThrow(ServiceError);
      await expect(adapter.listTools()).rejects.toMatchObject({
        code: ErrorCode.SERVICE_NOT_RUNNING,
      });
    });

    it('should list tools when running', async () => {
      await adapter.initialize();
      const tools = await adapter.listTools();
      
      expect(tools.tools).toHaveLength(1);
      expect(tools.tools[0].name).toBe('test-tool');
    });

    it('should return cached tools on subsequent calls', async () => {
      await adapter.initialize();
      
      adapter.doListToolsCalled = false;
      const tools1 = await adapter.listTools();
      expect(adapter.doListToolsCalled).toBe(false); // Should use cache
      
      const tools2 = await adapter.listTools();
      expect(tools1).toEqual(tools2);
    });

    it('should refresh tools cache', async () => {
      await adapter.initialize();
      
      adapter.doListToolsCalled = false;
      const tools = await adapter.refreshTools();
      expect(adapter.doListToolsCalled).toBe(true); // Should call doListTools
      expect(tools.tools).toHaveLength(1);
    });
  });

  describe('callTool', () => {
    it('should throw error if not running', async () => {
      const request: CallToolRequest = {
        name: 'test-tool',
        arguments: {},
      };
      
      await expect(adapter.callTool(request)).rejects.toThrow(ServiceError);
      await expect(adapter.callTool(request)).rejects.toMatchObject({
        code: ErrorCode.SERVICE_NOT_RUNNING,
      });
    });

    it('should call tool when running', async () => {
      await adapter.initialize();
      
      const request: CallToolRequest = {
        name: 'test-tool',
        arguments: { param: 'value' },
      };
      
      const result = await adapter.callTool(request);
      
      expect(adapter.doCallToolCalled).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('close', () => {
    it('should close successfully', async () => {
      await adapter.initialize();
      await adapter.close();
      
      expect(adapter.doCloseCalled).toBe(true);
      expect(adapter.getStatus()).toBe(MCPServiceStatus.STOPPED);
      expect(adapter.isRunning()).toBe(false);
    });

    it('should be idempotent (no-op if already stopped)', async () => {
      await adapter.close();
      await adapter.close(); // Should not throw
      
      expect(adapter.doCloseCalled).toBe(false);
    });

    it('should clear cached data', async () => {
      await adapter.initialize();
      const metadataBefore = adapter.getMetadata();
      expect(metadataBefore.serverInfo).toBeDefined();
      
      await adapter.close();
      const metadataAfter = adapter.getMetadata();
      expect(metadataAfter.serverInfo).toBeUndefined();
    });
  });

  describe('getMetadata', () => {
    it('should return basic metadata when stopped', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('test-service');
      expect(metadata.name).toBe('Test Service');
      expect(metadata.description).toBe('A test service');
      expect(metadata.status).toBe(MCPServiceStatus.STOPPED);
    });

    it('should include server info when running', async () => {
      await adapter.initialize();
      const metadata = adapter.getMetadata();
      
      expect(metadata.status).toBe(MCPServiceStatus.RUNNING);
      expect(metadata.serverInfo).toBeDefined();
      expect(metadata.serverInfo?.name).toBe('Mock Service');
      expect(metadata.capabilities).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should set ERROR status on initialization failure', async () => {
      class FailingAdapter extends BaseServiceAdapter {
        protected async doInitialize(): Promise<InitializeResult> {
          throw new Error('Initialization failed');
        }
        protected async doListTools(): Promise<ListToolsResult> {
          return { tools: [] };
        }
        protected async doCallTool(): Promise<CallToolResult> {
          return { content: [] };
        }
        protected async doClose(): Promise<void> {}
      }
      
      const failingAdapter = new FailingAdapter(mockConfig);
      
      await expect(failingAdapter.initialize()).rejects.toThrow(ServiceError);
      expect(failingAdapter.getStatus()).toBe(MCPServiceStatus.ERROR);
    });
  });
});
