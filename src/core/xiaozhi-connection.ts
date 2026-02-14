/**
 * Xiaozhi Connection
 * Manages WebSocket connection to xiaozhi endpoint
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  XiaozhiMessage,
  XiaozhiMessageType,
  XiaozhiListToolsRequest,
  XiaozhiCallToolRequest,
  isListToolsRequest,
  isCallToolRequest,
} from '../types/xiaozhi.js';
import { ToolAggregator } from './tool-aggregator.js';
import { ConnectionError } from '../types/errors.js';
import { logger } from '../utils/logger.js';

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
 * Xiaozhi Connection Manager
 */
export class XiaozhiConnection extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isManualClose = false;

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

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    logger.info('Disconnected from xiaozhi');
    return Promise.resolve();
  }

  /**
   * Send a message to xiaozhi
   */
  private send(message: XiaozhiMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new ConnectionError('WebSocket not connected');
    }

    const json = JSON.stringify(message);
    this.ws.send(json);
    logger.debug('Sent message to xiaozhi', { type: message.type });
  }

  /**
   * Handle connection open
   */
  private handleOpen(): void {
    logger.info('Connected to xiaozhi');
    this.reconnectAttempts = 0;
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

      const message: XiaozhiMessage = JSON.parse(dataStr) as XiaozhiMessage;
      logger.debug('Received message from xiaozhi', { type: message.type });

      this.emit(ConnectionEvent.MESSAGE, message);

      // Handle request messages
      if (isListToolsRequest(message)) {
        await this.handleListTools(message);
      } else if (isCallToolRequest(message)) {
        await this.handleCallTool(message);
      }
    } catch (error) {
      // Convert data to string for logging
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
      logger.error('Failed to handle message', { error, dataStr });
      this.sendError('INVALID_MESSAGE', 'Failed to parse message', error);
    }
  }

  /**
   * Handle list tools request
   */
  private async handleListTools(request: XiaozhiListToolsRequest): Promise<void> {
    try {
      const tools = await this.toolAggregator.getAllTools();

      // Remove service-specific fields before sending
      const cleanTools = tools.map(({ serviceId: _serviceId, serviceName: _serviceName, ...tool }) => tool);

      this.send({
        type: XiaozhiMessageType.TOOLS_LIST_RESULT,
        id: request.id,
        tools: cleanTools,
      });
    } catch (error) {
      logger.error('Failed to list tools', { error });
      this.sendError(
        'TOOL_LIST_FAILED',
        'Failed to list tools',
        error,
        request.id
      );
    }
  }

  /**
   * Handle call tool request
   */
  private async handleCallTool(request: XiaozhiCallToolRequest): Promise<void> {
    try {
      const result = await this.toolAggregator.callTool({
        name: request.name,
        arguments: request.arguments,
      });

      this.send({
        type: XiaozhiMessageType.TOOLS_CALL_RESULT,
        id: request.id,
        content: result.content,
        isError: result.isError,
      });
    } catch (error) {
      logger.error('Failed to call tool', { toolName: request.name, error });
      this.sendError(
        'TOOL_CALL_FAILED',
        error instanceof Error ? error.message : String(error),
        error,
        request.id
      );
    }
  }

  /**
   * Send error message to xiaozhi
   */
  private sendError(code: string, message: string, details?: unknown, id?: string): void {
    try {
      this.send({
        type: XiaozhiMessageType.ERROR,
        id,
        code,
        message,
        details,
      });
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
      logger.error('Max reconnect attempts reached', { attempts: this.reconnectAttempts });
      this.emit(
        ConnectionEvent.ERROR,
        new ConnectionError('Max reconnect attempts reached')
      );
      return;
    }

    this.reconnectAttempts++;
    logger.info('Scheduling reconnect', {
      attempt: this.reconnectAttempts,
      maxAttempts,
      delay: interval,
    });

    this.reconnectTimer = setTimeout(() => {
      void this.connect().catch((error: unknown) => {
        logger.error('Reconnect failed', { error });
      });
    }, interval);
  }

  /**
   * Notify xiaozhi that tools have been updated
   */
  notifyToolsUpdated(): void {
    try {
      this.send({
        type: XiaozhiMessageType.TOOLS_UPDATED,
      });
      logger.info('Notified xiaozhi of tools update');
    } catch (error) {
      logger.error('Failed to notify tools update', { error });
    }
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
