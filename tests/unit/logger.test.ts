/**
 * Logger Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Logger } from '../../src/utils';
import type { ServerConfig } from '../../src/types';

// Mock winston
jest.mock('winston', () => {
  const mockTransport = {
    once: jest.fn(),
    on: jest.fn(),
    format: jest.fn(),
    level: 'info'
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
    transports: [],
    add: jest.fn(),
    remove: jest.fn()
  };

  // Store printf formatter function for testing
  let printfFormatter: any = null;

  return {
    createLogger: jest.fn((options: any) => {
      mockLogger.transports = options.transports || [];
      mockLogger.level = options.level || 'info';
      
      // If format includes printf, store it for testing
      if (options.format) {
        const formats = Array.isArray(options.format) ? options.format : [options.format];
        formats.forEach((fmt: any) => {
          if (typeof fmt === 'function') {
            printfFormatter = fmt;
          } else if (Array.isArray(fmt)) {
            fmt.forEach((f: any) => {
              if (typeof f === 'function') printfFormatter = f;
            });
          }
        });
      }
      
      return mockLogger;
    }),
    format: {
      combine: jest.fn((...args) => {
        // Return combined format that we can test
        return args.length > 0 ? args : jest.fn();
      }),
      timestamp: jest.fn(() => ({ timestamp: '2024-01-01 12:00:00' })),
      errors: jest.fn((options) => options),
      json: jest.fn(),
      colorize: jest.fn((level: string) => level),
      printf: jest.fn((fn) => {
        printfFormatter = fn;
        return fn;
      })
    },
    transports: {
      Console: jest.fn(() => mockTransport),
      File: jest.fn(() => mockTransport)
    },
    // Export for testing
    __getPrintfFormatter: () => printfFormatter
  };
});

describe('Logger', () => {
  let mockConfig: ServerConfig;
  let logger: Logger;

  // ============================================================================
  // Test Data Factories
  // ============================================================================

  function createServerConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
    return {
      omise: {
        secretKey: 'skey_test_1234567890',
        environment: 'test',
        apiVersion: '2017-11-02',
        baseUrl: 'https://api.omise.co',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      server: {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server',
        port: 3000,
        host: 'localhost'
      },
      logging: {
        level: 'info',
        format: 'simple',
        enableRequestLogging: false,
        enableResponseLogging: false
      },
      rateLimit: {
        enabled: false,
        maxRequests: 100,
        windowMs: 60000
      },
      tools: {
        allowed: 'all'
      },
      ...overrides
    };
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockConfig = createServerConfig();
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe('Constructor', () => {
    it('should create logger instance with test environment', () => {
      // Act
      logger = new Logger(mockConfig);

      // Assert
      expect(logger).toBeDefined();
      expect((logger as any).config).toBe(mockConfig);
    });

    it('should create logger instance with production environment', () => {
      // Arrange
      const productionConfig = createServerConfig({
        omise: {
          ...mockConfig.omise,
          environment: 'production'
        }
      });

      // Act
      logger = new Logger(productionConfig);

      // Assert
      expect(logger).toBeDefined();
      expect((logger as any).config.omise.environment).toBe('production');
    });

    it('should create access log file in production when request logging is enabled', () => {
      // Arrange
      const productionConfig = createServerConfig({
        omise: {
          ...mockConfig.omise,
          environment: 'production'
        },
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });

      // Act
      logger = new Logger(productionConfig);
      const mockLogger = (logger as any).logger;

      // Assert
      expect(logger).toBeDefined();
      expect(mockLogger.transports.length).toBeGreaterThan(1); // Console + File transports
      // Verify access log transport is created (this covers line 54)
    });

    it('should create logger with json format', () => {
      // Arrange
      const jsonConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          format: 'json'
        }
      });

      // Act
      logger = new Logger(jsonConfig);

      // Assert
      expect(logger).toBeDefined();
      expect((logger as any).config.logging.format).toBe('json');
    });

    it('should format console output with metadata when format is simple', () => {
      // Arrange
      const simpleConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          format: 'simple'
        }
      });
      
      // Act
      logger = new Logger(simpleConfig);
      
      // Get the printf formatter from winston mock
      const winston = require('winston');
      const printfFormatter = (winston as any).__getPrintfFormatter?.();
      
      if (printfFormatter) {
        // Test the printf formatter with metadata that has keys (covers lines 89-93)
        const result = printfFormatter({
          timestamp: '2024-01-01 12:00:00',
          level: 'info',
          message: 'Test message',
          userId: '123',
          action: 'test'
        });
        
        // Assert - should include JSON.stringify of meta
        expect(result).toContain('Test message');
        expect(result).toContain('{"userId":"123","action":"test"}');
      }
      
      // Assert logger is created
      expect(logger).toBeDefined();
    });

    it('should format console output without metadata when meta is empty', () => {
      // Arrange
      const simpleConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          format: 'simple'
        }
      });
      
      // Act
      logger = new Logger(simpleConfig);
      
      // Get the printf formatter from winston mock
      const winston = require('winston');
      const printfFormatter = (winston as any).__getPrintfFormatter?.();
      
      if (printfFormatter) {
        // Test the printf formatter without metadata (covers the else branch)
        const result = printfFormatter({
          timestamp: '2024-01-01 12:00:00',
          level: 'info',
          message: 'Test message'
        });
        
        // Assert - should not include JSON.stringify since meta is empty
        expect(result).toContain('Test message');
        expect(result).not.toContain('{');
      }
      
      // Assert logger is created
      expect(logger).toBeDefined();
    });

    it('should create logger with debug level', () => {
      // Arrange
      const debugConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          level: 'debug'
        }
      });

      // Act
      logger = new Logger(debugConfig);

      // Assert
      expect(logger).toBeDefined();
      expect((logger as any).config.logging.level).toBe('debug');
    });
  });

  // ============================================================================
  // Basic Log Methods Tests
  // ============================================================================

  describe('Basic Log Methods', () => {
    beforeEach(() => {
      logger = new Logger(mockConfig);
    });

    it('should log info message', () => {
      // Arrange
      const message = 'Test info message';
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.info(message);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(message);
    });

    it('should log info message with metadata', () => {
      // Arrange
      const message = 'Test info message';
      const metadata = { userId: '123', action: 'test' };
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.info(message, metadata);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(message, metadata);
    });

    it('should log multiple metadata arguments', () => {
      // Arrange
      const message = 'Test info message';
      const metadata1 = { userId: '123' };
      const metadata2 = { action: 'test' };
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.info(message, metadata1, metadata2);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(message, metadata1, metadata2);
    });

    it('should log warn message', () => {
      // Arrange
      const message = 'Test warning message';
      const mockLogger = (logger as any).logger;
      mockLogger.warn.mockClear();

      // Act
      logger.warn(message);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(message);
    });

    it('should log warn message with metadata', () => {
      // Arrange
      const message = 'Test warning message';
      const metadata = { reason: 'test' };
      const mockLogger = (logger as any).logger;
      mockLogger.warn.mockClear();

      // Act
      logger.warn(message, metadata);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(message, metadata);
    });

    it('should log error message', () => {
      // Arrange
      const message = 'Test error message';
      const error = new Error('Test error');
      const mockLogger = (logger as any).logger;
      mockLogger.error.mockClear();

      // Act
      logger.error(message, error);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String)
        })
      );
    });

    it('should log error message with metadata', () => {
      // Arrange
      const message = 'Test error message';
      const error = new Error('Test error');
      const metadata = { context: 'test' };
      const mockLogger = (logger as any).logger;
      mockLogger.error.mockClear();

      // Act
      logger.error(message, error, metadata);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          '0': expect.objectContaining({ context: 'test' }),
          error: 'Test error',
          stack: expect.any(String)
        })
      );
    });

    it('should log debug message', () => {
      // Arrange
      const message = 'Test debug message';
      const mockLogger = (logger as any).logger;
      mockLogger.debug.mockClear();

      // Act
      logger.debug(message);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(message);
    });

    it('should log debug message with metadata', () => {
      // Arrange
      const message = 'Test debug message';
      const metadata = { debugInfo: 'test' };
      const mockLogger = (logger as any).logger;
      mockLogger.debug.mockClear();

      // Act
      logger.debug(message, metadata);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(message, metadata);
    });
  });

  // ============================================================================
  // Structured Log Methods Tests
  // ============================================================================

  describe('Structured Log Methods', () => {
    beforeEach(() => {
      logger = new Logger(mockConfig);
    });

    it('should log request when request logging is enabled', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', { 'Content-Type': 'application/json' }, { amount: 100 });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          type: 'request',
          method: 'POST',
          url: '/api/charges',
          headers: { 'Content-Type': 'application/json' },
          body: { amount: 100 },
          timestamp: expect.any(String)
        })
      );
    });

    it('should not log request when request logging is disabled', () => {
      // Arrange
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', { 'Content-Type': 'application/json' });

      // Assert
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log response when response logging is enabled', () => {
      // Arrange
      const responseConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableResponseLogging: true
        }
      });
      logger = new Logger(responseConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logResponse('POST', '/api/charges', 200, { 'Content-Type': 'application/json' }, { id: '123' }, 150);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Response',
        expect.objectContaining({
          type: 'response',
          method: 'POST',
          url: '/api/charges',
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { id: '123' },
          duration: 150,
          timestamp: expect.any(String)
        })
      );
    });

    it('should not log response when response logging is disabled', () => {
      // Arrange
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logResponse('POST', '/api/charges', 200, {});

      // Assert
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log error with context', () => {
      // Arrange
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      const mockLogger = (logger as any).logger;
      mockLogger.error.mockClear();

      // Act
      logger.logError(error, context);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application Error',
        expect.objectContaining({
          type: 'error',
          message: 'Test error',
          stack: expect.any(String),
          context,
          timestamp: expect.any(String)
        })
      );
    });

    it('should log error without context', () => {
      // Arrange
      const error = new Error('Test error');
      const mockLogger = (logger as any).logger;
      mockLogger.error.mockClear();

      // Act
      logger.logError(error);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application Error',
        expect.objectContaining({
          type: 'error',
          message: 'Test error',
          stack: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('should log security event', () => {
      // Arrange
      const event = 'authentication_failure';
      const details = { ip: '127.0.0.1', attempts: 3 };
      const mockLogger = (logger as any).logger;
      mockLogger.warn.mockClear();

      // Act
      logger.logSecurity(event, details);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'security',
          event: 'authentication_failure',
          details,
          timestamp: expect.any(String)
        })
      );
    });

    it('should log performance metric', () => {
      // Arrange
      const operation = 'database_query';
      const duration = 150;
      const details = { table: 'charges', count: 100 };
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logPerformance(operation, duration, details);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance Metric',
        expect.objectContaining({
          type: 'performance',
          operation: 'database_query',
          duration: 150,
          details,
          timestamp: expect.any(String)
        })
      );
    });

    it('should log performance metric without details', () => {
      // Arrange
      const operation = 'database_query';
      const duration = 150;
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logPerformance(operation, duration);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance Metric',
        expect.objectContaining({
          type: 'performance',
          operation: 'database_query',
          duration: 150,
          timestamp: expect.any(String)
        })
      );
    });

    it('should log business event', () => {
      // Arrange
      const event = 'charge_created';
      const details = { chargeId: 'chrg_123', amount: 100 };
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logBusiness(event, details);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Business Event',
        expect.objectContaining({
          type: 'business',
          event: 'charge_created',
          details,
          timestamp: expect.any(String)
        })
      );
    });
  });

  // ============================================================================
  // Sanitization Tests
  // ============================================================================

  describe('Sanitization Methods', () => {
    beforeEach(() => {
      logger = new Logger(mockConfig);
    });

    it('should sanitize authorization header in log request', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', { 'authorization': 'Bearer secret123' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          headers: { authorization: '[REDACTED]' }
        })
      );
    });

    it('should sanitize x-api-key header in log request', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', { 'x-api-key': 'secret123' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          headers: { 'x-api-key': '[REDACTED]' }
        })
      );
    });

    it('should sanitize cookie header in log request', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', { 'cookie': 'session=abc123' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          headers: { cookie: '[REDACTED]' }
        })
      );
    });

    it('should sanitize password field in request body', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/login', {}, { username: 'test', password: 'secret123' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          body: expect.objectContaining({
            username: 'test',
            password: '[REDACTED]'
          })
        })
      );
    });

    it('should sanitize secret field in request body', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/config', {}, { api_secret: 'secret123' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          body: expect.objectContaining({
            api_secret: '[REDACTED]'
          })
        })
      );
    });

    it('should sanitize token field in request body', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/payment', {}, { payment_token: 'token123' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          body: expect.objectContaining({
            payment_token: '[REDACTED]'
          })
        })
      );
    });

    it('should sanitize card_number field in request body', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', {}, { card_number: '4111111111111111' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          body: expect.objectContaining({
            card_number: '[REDACTED]'
          })
        })
      );
    });

    it('should sanitize cvv field in request body', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', {}, { cvv: '123' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          body: expect.objectContaining({
            cvv: '[REDACTED]'
          })
        })
      );
    });

    it('should sanitize nested sensitive fields in request body', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/payment', {}, {
        user: {
          username: 'test',
          password: 'secret123'
        },
        payment: {
          card_number: '4111111111111111',
          cvv: '123'
        }
      });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          body: expect.objectContaining({
            user: {
              username: 'test',
              password: '[REDACTED]'
            },
            payment: {
              card_number: '[REDACTED]',
              cvv: '[REDACTED]'
            }
          })
        })
      );
    });

    it('should sanitize sensitive fields in arrays', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/users', {}, {
        users: [
          { username: 'test1', password: 'secret1' },
          { username: 'test2', password: 'secret2' }
        ]
      });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          body: expect.objectContaining({
            users: [
              { username: 'test1', password: '[REDACTED]' },
              { username: 'test2', password: '[REDACTED]' }
            ]
          })
        })
      );
    });

    it('should not sanitize non-sensitive fields', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', {}, { amount: 100, currency: 'THB', description: 'test' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          body: { amount: 100, currency: 'THB', description: 'test' }
        })
      );
    });

    it('should handle primitive body values (string, number, boolean)', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act - test with string body (covers line 250 branch in sanitizeObject)
      logger.logRequest('POST', '/api/test', {}, 'simple string');

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
      
      // Test with number
      mockLogger.info.mockClear();
      logger.logRequest('POST', '/api/test', {}, 123);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();

      // Test with boolean
      mockLogger.info.mockClear();
      logger.logRequest('POST', '/api/test', {}, true);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Utility Methods Tests
  // ============================================================================

  describe('Utility Methods', () => {
    beforeEach(() => {
      logger = new Logger(mockConfig);
    });

    it('should set log level', () => {
      // Arrange
      const mockLogger = (logger as any).logger;
      mockLogger.level = 'info';

      // Act
      logger.setLevel('debug');

      // Assert
      expect(mockLogger.level).toBe('debug');
    });

    it('should rotate logs', () => {
      // Arrange
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.rotateLogs();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('Log rotation initiated');
    });

    it('should get log statistics', () => {
      // Arrange
      const mockLogger = (logger as any).logger;
      mockLogger.level = 'info';
      mockLogger.transports = [{ type: 'console' }, { type: 'file' }];

      // Act
      const stats = logger.getLogStats();

      // Assert
      expect(stats).toEqual({
        level: 'info',
        transports: 2,
        timestamp: expect.any(String)
      });
    });

    it('should handle empty transports in log statistics', () => {
      // Arrange
      const mockLogger = (logger as any).logger;
      mockLogger.transports = [];

      // Act
      const stats = logger.getLogStats();

      // Assert
      expect(stats.transports).toBe(0);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    it('should work together: create logger, log messages, get stats', () => {
      // Arrange
      logger = new Logger(mockConfig);
      const mockLogger = (logger as any).logger;

      // Act
      logger.info('Test message');
      logger.warn('Test warning');
      logger.error('Test error', new Error('Test'));
      const stats = logger.getLogStats();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('Test message');
      expect(mockLogger.warn).toHaveBeenCalledWith('Test warning');
      expect(mockLogger.error).toHaveBeenCalled();
      expect(stats).toBeDefined();
    });

    it('should handle complete request/response logging workflow', () => {
      // Arrange
      const workflowConfig = createServerConfig({
        logging: {
          level: 'info',
          format: 'json',
          enableRequestLogging: true,
          enableResponseLogging: true
        }
      });
      logger = new Logger(workflowConfig);
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/charges', { Authorization: 'Bearer token' }, { amount: 100 });
      logger.logResponse('POST', '/api/charges', 200, { 'Content-Type': 'application/json' }, { id: '123' }, 150);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({ type: 'request' })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Response',
        expect.objectContaining({ type: 'response' })
      );
    });

    it('should handle security and business event logging', () => {
      // Arrange
      logger = new Logger(mockConfig);
      const mockLogger = (logger as any).logger;
      mockLogger.warn.mockClear();
      mockLogger.info.mockClear();

      // Act
      logger.logSecurity('authentication_failure', { ip: '127.0.0.1' });
      logger.logBusiness('charge_created', { chargeId: 'chrg_123' });

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({ type: 'security' })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Business Event',
        expect.objectContaining({ type: 'business' })
      );
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      logger = new Logger(mockConfig);
    });

    it('should handle undefined headers in log request', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('GET', '/api/test', undefined as any);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'API Request',
        expect.objectContaining({
          headers: undefined
        })
      );
    });

    it('should handle null body in log request', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/test', {}, null);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle empty body in log request', () => {
      // Arrange
      const requestConfig = createServerConfig({
        logging: {
          ...mockConfig.logging,
          enableRequestLogging: true
        }
      });
      logger = new Logger(requestConfig);
      
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.logRequest('POST', '/api/test', {}, {});

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle log level change during runtime', () => {
      // Arrange
      const mockLogger = (logger as any).logger;
      mockLogger.level = 'info';

      // Act
      logger.setLevel('warn');
      expect(mockLogger.level).toBe('warn');

      logger.setLevel('error');
      expect(mockLogger.level).toBe('error');

      logger.setLevel('debug');
      expect(mockLogger.level).toBe('debug');
    });

    it('should handle very long messages', () => {
      // Arrange
      const longMessage = 'A'.repeat(10000);
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.info(longMessage);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(longMessage);
    });

    it('should handle special characters in messages', () => {
      // Arrange
      const message = 'Test message with special chars: @#$%^&*()[]{}';
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.info(message);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(message);
    });

    it('should handle emoji in messages', () => {
      // Arrange
      const message = 'Test message with emoji: 🚀 ✅ ❌';
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.info(message);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(message);
    });

    it('should handle circular references in metadata', () => {
      // Arrange
      const circular: any = { name: 'test' };
      circular.self = circular;
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.info('Test message', circular);

      // Assert
      // Should not throw, JSON.stringify will handle circular references
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle undefined metadata gracefully', () => {
      // Arrange
      const mockLogger = (logger as any).logger;
      mockLogger.info.mockClear();

      // Act
      logger.info('Test message', undefined, null);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});

