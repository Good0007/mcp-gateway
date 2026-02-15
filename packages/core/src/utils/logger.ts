/**
 * Logger Utility
 * Centralized logging with Winston
 */

import winston from 'winston';
import TransportStream from 'winston-transport';
import { getLogBuffer, type LogEntry } from './log-buffer.js';

/**
 * Log level type
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level?: LogLevel;
  file?: string;
  console?: boolean;
  buffer?: boolean;  // Enable log buffer
}

/**
 * Custom transport to push logs to LogBuffer
 */
class LogBufferTransport extends TransportStream {
  constructor(opts?: TransportStream.TransportStreamOptions) {
    super(opts);
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      const logBuffer = getLogBuffer();
      
      const entry: LogEntry = {
        timestamp: info.timestamp || new Date().toISOString(),
        level: info.level as LogEntry['level'],
        message: info.message,
        service: info.service,
        meta: { ...info },
      };

      // Remove internal winston fields
      if (entry.meta) {
        delete entry.meta.level;
        delete entry.meta.message;
        delete entry.meta.timestamp;
      }

      logBuffer.add(entry);
    });

    callback();
  }
}

/**
 * Create a logger instance
 */
export function createLogger(config: LoggerConfig = {}): winston.Logger {
  const { level = 'info', file, console: enableConsole = true, buffer = true } = config;

  const transports: winston.transport[] = [];

  // Console transport
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, ...meta }: winston.Logform.TransformableInfo) => {
            let msg = `${String(timestamp)} [${String(level)}]: ${String(message)}`;
            if (Object.keys(meta).length > 0) {
              msg += ` ${JSON.stringify(meta)}`;
            }
            return msg;
          })
        ),
      })
    );
  }

  // File transport
  if (file) {
    transports.push(
      new winston.transports.File({
        filename: file,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json()
        ),
      })
    );
  }

  // LogBuffer transport (for API access)
  if (buffer) {
    transports.push(
      new LogBufferTransport({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json()
        ),
      })
    );
  }

  return winston.createLogger({
    level,
    transports,
    exceptionHandlers: transports,
    rejectionHandlers: transports,
  });
}

/**
 * Default logger instance
 */
let defaultLogger: winston.Logger | null = null;

/**
 * Initialize default logger
 */
export function initLogger(config: LoggerConfig = {}): winston.Logger {
  defaultLogger = createLogger(config);
  return defaultLogger;
}

/**
 * Get default logger
 */
export function getLogger(): winston.Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

/**
 * Convenience logging functions
 */
export const logger = {
  error: (message: string, meta?: unknown) => getLogger().error(message, meta),
  warn: (message: string, meta?: unknown) => getLogger().warn(message, meta),
  info: (message: string, meta?: unknown) => getLogger().info(message, meta),
  debug: (message: string, meta?: unknown) => getLogger().debug(message, meta),
};
