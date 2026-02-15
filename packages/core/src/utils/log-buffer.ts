/**
 * Log Buffer
 * In-memory circular buffer for storing recent logs
 */

import { EventEmitter } from 'events';

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  service?: string;
  meta?: Record<string, any>;
}

/**
 * Circular buffer for storing logs
 */
export class LogBuffer extends EventEmitter {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    super();
    this.maxSize = maxSize;
  }

  /**
   * Add a log entry
   */
  add(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep buffer size under limit
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }

    // Emit event for real-time updates
    this.emit('log', entry);
  }

  /**
   * Get all logs
   */
  getAll(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs with filters
   */
  get(options: {
    level?: LogEntry['level'];
    service?: string;
    limit?: number;
    search?: string;
  } = {}): LogEntry[] {
    let filtered = this.logs;

    // Filter by level
    if (options.level) {
      filtered = filtered.filter(log => log.level === options.level);
    }

    // Filter by service
    if (options.service) {
      filtered = filtered.filter(log => log.service === options.service);
    }

    // Filter by search query
    if (options.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(search) ||
        log.service?.toLowerCase().includes(search)
      );
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.emit('cleared');
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.logs.length;
  }
}

// Global log buffer instance
let globalLogBuffer: LogBuffer | null = null;

/**
 * Get or create global log buffer
 */
export function getLogBuffer(): LogBuffer {
  if (!globalLogBuffer) {
    globalLogBuffer = new LogBuffer();
  }
  return globalLogBuffer;
}

/**
 * Initialize global log buffer
 */
export function initLogBuffer(maxSize = 1000): LogBuffer {
  globalLogBuffer = new LogBuffer(maxSize);
  return globalLogBuffer;
}
