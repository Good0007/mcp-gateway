/**
 * Logger Unit Tests
 */

import { logger, getLogger, createLogger, initLogger } from '../../../src/utils/logger.js';

describe('Logger', () => {
  it('should export logger utility functions', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log info messages without throwing', () => {
    expect(() => logger.info('Test info message')).not.toThrow();
  });

  it('should log error messages without throwing', () => {
    expect(() => logger.error('Test error message')).not.toThrow();
  });

  it('should log warn messages without throwing', () => {
    expect(() => logger.warn('Test warning message')).not.toThrow();
  });

  it('should log debug messages without throwing', () => {
    expect(() => logger.debug('Test debug message')).not.toThrow();
  });

  it('should accept metadata object', () => {
    const metadata = { userId: 123, action: 'test' };
    expect(() => logger.info('Message with metadata', metadata)).not.toThrow();
  });

  it('should handle error objects', () => {
    const error = new Error('Test error');
    expect(() => logger.error('Error occurred', { error })).not.toThrow();
  });
});

describe('getLogger', () => {
  it('should return a winston logger instance', () => {
    const loggerInstance = getLogger();
    expect(loggerInstance).toBeDefined();
    expect(typeof loggerInstance.info).toBe('function');
  });
});

describe('createLogger', () => {
  it('should create a logger with default config', () => {
    const loggerInstance = createLogger();
    expect(loggerInstance).toBeDefined();
    expect(loggerInstance.level).toBe('info');
  });

  it('should create a logger with custom level', () => {
    const loggerInstance = createLogger({ level: 'debug' });
    expect(loggerInstance.level).toBe('debug');
  });

  it('should create a logger with console disabled', () => {
    const loggerInstance = createLogger({ console: false });
    expect(loggerInstance).toBeDefined();
  });
});

describe('initLogger', () => {
  it('should initialize and return logger', () => {
    const loggerInstance = initLogger({ level: 'warn' });
    expect(loggerInstance).toBeDefined();
    expect(loggerInstance.level).toBe('warn');
  });
});
