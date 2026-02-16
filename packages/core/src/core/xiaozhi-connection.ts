/**
 * Xiaozhi Connection
 * Manages WebSocket connection to xiaozhi endpoint using MCP standard protocol
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
  JSONRPCNotification,
  RequestId,
  ErrorCode,
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
  ListToolsResult,
  CallToolParams,
  CallToolResult,
  PingResult,
  isRequest,
  isInitializeRequest,
  isPingRequest,
  isListToolsRequest,
  isCallToolRequest,
  isInitializedNotification,
} from '../types/mcp-protocol.js';
import { ToolAggregator } from './tool-aggregator.js';
import { ConnectionError } from '../types/errors.js';
import { logger } from '../utils/logger.js';

// Version constant
const MCP_AGENT_VERSION = '0.1.0';

/**
 * Connection events
 */
export enum ConnectionEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  MESSAGE = 'message',
}

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  endpoint: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Initialization state
 */
enum InitState {
  NOT_INITIALIZED = 'not_initialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
}

/**
 * Xiaozhi Connection Manager (MCP Standard Protocol)
 */
export class XiaozhiConnection extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isManualClose = false;
  private pingTimer: NodeJS.Timeout | null = null;
  private initState: InitState = InitState.NOT_INITIALIZED;
  private clientInfo?: { name: string; version: string };

  constructor(
    private readonly config: ConnectionConfig,
    private readonly toolAggregator: ToolAggregator
  ) {
    super();
  }

  /**
   * Connect to xiaozhi endpoint
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.warn('Already connected to xiaozhi');
      return;
    }

    this.isManualClose = false;

    try {
      logger.info('Connecting to xiaozhi', { endpoint: this.config.endpoint });

      this.ws = new WebSocket(this.config.endpoint);

      // Setup event handlers
      this.ws.on('open', this.handleOpen.bind(this));
      this.ws.on('message', (data: WebSocket.Data) => void this.handleMessage(data));
      this.ws.on('error', this.handleError.bind(this));
      this.ws.on('close', this.handleClose.bind(this));

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new ConnectionError('Connection timeout'));
        }, 10000);

        this.once(ConnectionEvent.CONNECTED, () => {
          clearTimeout(timeout);
          resolve();
        });

        this.once(ConnectionEvent.ERROR, (error: unknown) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Failed to connect to xiaozhi', { error });
      throw error;
    }
  }

  /**
   * Disconnect from xiaozhi
   */
  disconnect(): Promise<void> {
    this.isManualClose = true;

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    logger.info('Disconnected from xiaozhi');
    return Promise.resolve();
  }

  /**
   * Reconnect to xiaozhi (disconnect and connect again)
   * Useful for refreshing the connection and triggering a new initialize handshake
   */
  async reconnect(): Promise<void> {
    logger.info('Reconnecting to xiaozhi to refresh tool list');
    
    // Reset initialization state
    this.initState = InitState.NOT_INITIALIZED;
    this.reconnectAttempts = 0;
    
    await this.disconnect();
    
    // Wait a bit for graceful disconnect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await this.connect();
    
    logger.info('Reconnection complete, xiaozhi will re-fetch tools');
  }

  /**
   * Send a JSON-RPC message to xiaozhi
   */
  private send(message: JSONRPCMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new ConnectionError('WebSocket not connected');
    }

    const json = JSON.stringify(message);
    logger.info('Sending MCP message', { 
      method: 'method' in message ? message.method : 'response',
      id: 'id' in message ? message.id : undefined,
      raw: json 
    });
    this.ws.send(json);
  }

  /**
   * Handle connection open
   */
  private handleOpen(): void {
    logger.info('WebSocket connected, waiting for initialize request from xiaozhi');
    
    // Reset initialization state
    this.initState = InitState.NOT_INITIALIZED;
    
    // Start heartbeat
    this.startHeartbeat();
    
    this.emit(ConnectionEvent.CONNECTED);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(data: WebSocket.Data): Promise<void> {
    try {
      // Convert WebSocket.Data to string safely
      let dataStr: string;
      if (typeof data === 'string') {
        dataStr = data;
      } else if (Buffer.isBuffer(data)) {
        dataStr = data.toString('utf-8');
      } else if (Array.isArray(data)) {
        dataStr = Buffer.concat(data).toString('utf-8');
      } else {
        dataStr = String(data);
      }

      const message: JSONRPCMessage = JSON.parse(dataStr) as JSONRPCMessage;
      logger.info('Received MCP message', { 
        method: 'method' in message ? message.method : 'response',
        id: 'id' in message ? message.id : undefined,
        raw: dataStr 
      });

      this.emit(ConnectionEvent.MESSAGE, message);

      // Handle requests
      if (isRequest(message)) {
        await this.handleRequest(message);
      } else if (isInitializedNotification(message)) {
        await this.handleInitializedNotification();
      }
    } catch (error) {
      logger.error('Failed to handle message', { error });
      // Send parse error
      this.sendError(ErrorCode.PARSE_ERROR, 'Failed to parse message', undefined);
    }
  }

  /**
   * Route and handle JSON-RPC requests
   */
  private async handleRequest(request: JSONRPCRequest): Promise<void> {
    try {
      if (isInitializeRequest(request)) {
        this.handleInitialize(request);
      } else if (isPingRequest(request)) {
        this.handlePing(request);
      } else if (isListToolsRequest(request)) {
        await this.handleListTools(request);
      } else if (isCallToolRequest(request)) {
        await this.handleCallTool(request);
      } else {
        // Unknown method
        this.sendError(
          ErrorCode.METHOD_NOT_FOUND,
          `Method not found: ${(request as JSONRPCRequest).method}`,
          (request as JSONRPCRequest).id
        );
      }
    } catch (error) {
      logger.error('Failed to handle request', { method: (request).method, error });
      this.sendError(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal error',
        request.id
      );
    }
  }

  /**
   * Handle initialize request (MCP standard handshake)
   */
  private handleInitialize(request: JSONRPCRequest): void {
    try {
      logger.info('Processing initialize request');
      
      this.initState = InitState.INITIALIZING;
      
      const params = (request.params as unknown) as InitializeParams;
      this.clientInfo = params.clientInfo;
      
      logger.info('Client info', { 
        clientName: this.clientInfo.name,
        clientVersion: this.clientInfo.version,
        protocolVersion: params.protocolVersion
      });

      // Build server capabilities
      const capabilities: ServerCapabilities = {
        tools: {
          listChanged: true, // Support tools list change notifications
        },
      };

      // Build result
      const result: InitializeResult = {
        protocolVersion: params.protocolVersion, // Echo back the protocol version
        capabilities,
        serverInfo: {
          name: 'mcp-agent',
          version: MCP_AGENT_VERSION,
        },
        instructions: 'MCP Agent - Aggregates tools from multiple MCP services',
      };

      // Send response
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };

      this.send(response);
      
      logger.info('Sent initialize response', { serverInfo: result.serverInfo });
    } catch (error) {
      logger.error('Failed to handle initialize', { error });
      this.sendError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to initialize',
        request.id
      );
    }
  }

  /**
   * Handle initialized notification
   */
  private async handleInitializedNotification(): Promise<void> {
    logger.info('Received initialized notification, handshake complete');
    this.initState = InitState.INITIALIZED;
    
    // Now we can send tools list
    await this.notifyToolsUpdated();
  }

  /**
   * Handle list tools request
   */
  private async handleListTools(request: JSONRPCRequest): Promise<void> {
    try {
      logger.info('Processing tools/list request', { id: request.id });
      
      const tools = await this.toolAggregator.getAllTools();

      // Remove service-specific fields before sending
      const cleanTools = tools.map(({ serviceId: _serviceId, serviceName: _serviceName, ...tool }) => tool);

      logger.info('Responding with tools', { 
        requestId: request.id,
        toolCount: cleanTools.length,
        toolNames: cleanTools.map(t => t.name)
      });

      const result: ListToolsResult = {
        tools: cleanTools,
      };

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };

      this.send(response);
    } catch (error) {
      logger.error('Failed to list tools', { error });
      this.sendError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to list tools',
        request.id
      );
    }
  }

  /**
   * Handle call tool request
   */
  /**
   * Map parameter names from xiaozhi to MCP tool expectations
   * Xiaozhi may use different parameter names than the actual tools expect
   */
  private mapToolParameters(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
    // Parameter mapping table: xiaozhi name -> tool name
    const parameterMappings: Record<string, Record<string, string>> = {
      search_files: {
        keyword: 'pattern',  // xiaozhi sends 'keyword', tool expects 'pattern'
      },
      control: {
        device_id: 'entity_id',  // xiaozhi sends 'device_id', tool expects 'entity_id'
        action: 'command',       // xiaozhi sends 'action', tool expects 'command'
      },
      // Add more tool-specific mappings here if needed
    };

    const mapping = parameterMappings[toolName];
    if (!mapping) {
      return args; // No mapping needed for this tool
    }

    const mappedArgs = { ...args };
    for (const [xiaozhiName, toolName] of Object.entries(mapping)) {
      if (xiaozhiName in mappedArgs) {
        mappedArgs[toolName] = mappedArgs[xiaozhiName];
        delete mappedArgs[xiaozhiName];
      }
    }

    return mappedArgs;
  }

  private async handleCallTool(request: JSONRPCRequest): Promise<void> {
    try {
      const params = (request.params as unknown) as CallToolParams;
      logger.info('Processing tools/call request', { 
        id: request.id,
        tool: params.name,
        originalArgs: params.arguments 
      });
      
      // Map parameter names from xiaozhi to tool expectations
      const mappedArgs = this.mapToolParameters(params.name, params.arguments || {});
      
      logger.info('Mapped tool parameters', {
        tool: params.name,
        mappedArgs
      });
      
      const result = await this.toolAggregator.callTool({
        name: params.name,
        arguments: mappedArgs,
      });

      const callResult: CallToolResult = {
        content: result.content,
        isError: result.isError,
      };

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result: callResult,
      };

      this.send(response);
      
      logger.info('Sent tool call result', { 
        id: request.id,
        isError: result.isError 
      });
    } catch (error) {
      logger.error('Failed to call tool', { error });
      this.sendError(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to call tool',
        request.id
      );
    }
  }

  /**
   * Handle ping request from xiaozhi server
   */
  private handlePing(request: JSONRPCRequest): void {
    try {
      logger.debug('Received ping request', { id: request.id });
      
      const result: PingResult = {};

      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };

      this.send(response);
      logger.debug('Sent ping response', { id: request.id });
    } catch (error) {
      logger.error('Failed to handle ping', { error });
    }
  }

  /**
   * Send JSON-RPC error response
   */
  private sendError(code: number, message: string, id?: RequestId, data?: unknown): void {
    try {
      const error: JSONRPCError = {
        jsonrpc: '2.0',
        id: id || null as unknown as RequestId,
        error: {
          code,
          message,
          data,
        },
      };

      this.send(error);
      logger.debug('Sent error response', { code, message, id });
    } catch (error) {
      logger.error('Failed to send error message', { error });
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Error): void {
    logger.error('WebSocket error', { error });
    this.emit(ConnectionEvent.ERROR, error);
  }

  /**
   * Handle connection close
   */
  private handleClose(): void {
    logger.info('Connection closed');
    
    // Stop heartbeat
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    this.emit(ConnectionEvent.DISCONNECTED);

    // Attempt reconnect if not manually closed
    if (!this.isManualClose) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts || 10;
    const interval = this.config.reconnectInterval || 5000;

    if (this.reconnectAttempts >= maxAttempts) {
      const errorMsg = `Max reconnect attempts (${maxAttempts}) reached. Please check your connection and restart the service.`;
      logger.error(errorMsg, { 
        attempts: this.reconnectAttempts,
        endpoint: this.config.endpoint 
      });
      this.emit(
        ConnectionEvent.ERROR,
        new ConnectionError(errorMsg)
      );
      return;
    }

    this.reconnectAttempts++;
    const nextAttemptTime = new Date(Date.now() + interval).toISOString();
    logger.info('⏳ Scheduling reconnect to Xiaozhi', {
      attempt: this.reconnectAttempts,
      maxAttempts,
      delay: `${interval}ms`,
      nextAttempt: nextAttemptTime,
      endpoint: this.config.endpoint,
    });

    this.reconnectTimer = setTimeout(() => {
      logger.info('🔄 Attempting to reconnect to Xiaozhi...', {
        attempt: this.reconnectAttempts,
        maxAttempts,
      });
      
      void this.connect()
        .then(() => {
          logger.info('✅ Reconnected to Xiaozhi successfully', {
            afterAttempts: this.reconnectAttempts,
            endpoint: this.config.endpoint,
          });
          // Reset reconnect counter on successful connection
          this.reconnectAttempts = 0;
        })
        .catch((error: unknown) => {
          logger.error('❌ Reconnect attempt failed', { 
            attempt: this.reconnectAttempts,
            error,
            willRetry: this.reconnectAttempts < maxAttempts,
          });
        });
    }, interval);
  }

  /**
   * Notify xiaozhi that tools have been updated (MCP notification)
   */
  async notifyToolsUpdated(): Promise<void> {
    try {
      if (!this.isConnected() || this.initState !== InitState.INITIALIZED) {
        logger.debug('Not ready to send tools update notification', { 
          connected: this.isConnected(),
          initState: this.initState 
        });
        return;
      }
      
      // Get current tools
      const tools = await this.toolAggregator.getAllTools();
      logger.info('Notifying xiaozhi of tools update', { 
        toolCount: tools.length, 
        toolNames: tools.map(t => t.name) 
      });
      
      // Send MCP notification
      const notification: JSONRPCNotification = {
        jsonrpc: '2.0',
        method: 'notifications/tools/list_changed',
        params: {},
      };
      
      this.send(notification);
      logger.info('Sent tools/list_changed notification');
    } catch (error) {
      logger.error('Failed to notify tools update', { error });
    }
  }

  /**
   * Start heartbeat (send ping requests periodically)
   */
  private startHeartbeat(): void {
    // Clear existing timer
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    let pingCounter = 0;

    // Send MCP JSON-RPC ping every 50 seconds (as per MCP standard)
    this.pingTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        logger.warn('WebSocket not open, skipping heartbeat');
        return;
      }

      try {
        pingCounter++;
        const pingId = `ping_${Date.now()}_${pingCounter}`;
        
        // Send MCP standard JSON-RPC ping request
        const pingRequest: JSONRPCRequest = {
          jsonrpc: '2.0',
          id: pingId,
          method: 'ping',
          params: {},
        };
        
        this.send(pingRequest);
        logger.debug('Sent MCP heartbeat ping', { id: pingId });
      } catch (error) {
        logger.error('Failed to send heartbeat', { error });
      }
    }, 50000); // 50 seconds (MCP standard interval)
    
    logger.info('Heartbeat started (50s MCP JSON-RPC ping)');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      connected: this.isConnected(),
      endpoint: this.config.endpoint,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}
