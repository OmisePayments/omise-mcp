/**
 * Configuration Management Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { loadConfig, validateOmiseKeys, getServerInfo } from '../../src/utils';
import type { ServerConfig } from '../../src/types';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('Configuration Management', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear all environment variables
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  // ============================================================================
  // Test Data Factories
  // ============================================================================

  function createValidTestEnv(): NodeJS.ProcessEnv {
    return {
      OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
      OMISE_SECRET_KEY: 'skey_test_1234567890',
      OMISE_ENVIRONMENT: 'test',
      TOOLS: 'all'
    };
  }

  function createValidProductionEnv(): NodeJS.ProcessEnv {
    return {
      OMISE_PUBLIC_KEY: 'pkey_live_1234567890',
      OMISE_SECRET_KEY: 'skey_live_1234567890',
      OMISE_ENVIRONMENT: 'production',
      TOOLS: 'create_charge,list_charges'
    };
  }

  function createFullEnv(): NodeJS.ProcessEnv {
    return {
      // Required variables
      OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
      OMISE_SECRET_KEY: 'skey_test_1234567890',
      OMISE_ENVIRONMENT: 'test',
      TOOLS: 'all',
      
      // Optional Omise variables
      OMISE_API_VERSION: '2019-05-29',
      OMISE_BASE_URL: 'https://api.omise.co',
      OMISE_VAULT_URL: 'https://vault.omise.co',
      OMISE_TIMEOUT: '45000',
      OMISE_RETRY_ATTEMPTS: '5',
      OMISE_RETRY_DELAY: '2000',
      
      // Optional server variables
      SERVER_NAME: 'test-server',
      SERVER_VERSION: '2.0.0',
      SERVER_DESCRIPTION: 'Test MCP Server',
      PORT: '8080',
      HOST: '0.0.0.0',
      
      // Optional logging variables
      LOG_LEVEL: 'debug',
      LOG_FORMAT: 'json',
      LOG_REQUESTS: 'true',
      LOG_RESPONSES: 'false',
      
      // Optional rate limit variables
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_MAX_REQUESTS: '200',
      RATE_LIMIT_WINDOW_MS: '120000'
    };
  }

  // ============================================================================
  // loadConfig Function Tests
  // ============================================================================

  describe('loadConfig', () => {
    it('should load configuration with minimal required environment variables', () => {
      // Arrange
      Object.assign(process.env, createValidTestEnv());

      // Act
      const config = loadConfig();

      // Assert
      expect(config).toBeDefined();
      expect(config.omise.publicKey).toBe('pkey_test_1234567890');
      expect(config.omise.secretKey).toBe('skey_test_1234567890');
      expect(config.omise.environment).toBe('test');
      expect(config.tools.allowed).toBe('all');
    });

    it('should load configuration with all optional environment variables', () => {
      // Arrange
      Object.assign(process.env, createFullEnv());

      // Act
      const config = loadConfig();

      // Assert
      expect(config).toBeDefined();
      
      // Omise configuration
      expect(config.omise.publicKey).toBe('pkey_test_1234567890');
      expect(config.omise.secretKey).toBe('skey_test_1234567890');
      expect(config.omise.environment).toBe('test');
      expect(config.omise.apiVersion).toBe('2019-05-29');
      expect(config.omise.baseUrl).toBe('https://api.omise.co');
      expect(config.omise.vaultUrl).toBe('https://vault.omise.co');
      expect(config.omise.timeout).toBe(45000);
      expect(config.omise.retryAttempts).toBe(5);
      expect(config.omise.retryDelay).toBe(2000);
      
      // Server configuration
      expect(config.server.name).toBe('test-server');
      expect(config.server.version).toBe('2.0.0');
      expect(config.server.description).toBe('Test MCP Server');
      expect(config.server.port).toBe(8080);
      expect(config.server.host).toBe('0.0.0.0');
      
      // Logging configuration
      expect(config.logging.level).toBe('debug');
      expect(config.logging.format).toBe('json');
      expect(config.logging.enableRequestLogging).toBe(true);
      expect(config.logging.enableResponseLogging).toBe(false);
      
      // Rate limit configuration
      expect(config.rateLimit.enabled).toBe(true);
      expect(config.rateLimit.maxRequests).toBe(200);
      expect(config.rateLimit.windowMs).toBe(120000);
      
      // Tools configuration
      expect(config.tools.allowed).toBe('all');
    });

    it('should use default values when optional environment variables are not set', () => {
      // Arrange
      Object.assign(process.env, createValidTestEnv());

      // Act
      const config = loadConfig();

      // Assert
      expect(config.omise.apiVersion).toBe('2017-11-02');
      expect(config.omise.baseUrl).toBe('https://api.omise.co');
      expect(config.omise.vaultUrl).toBe('https://vault.omise.co');
      expect(config.omise.timeout).toBe(30000);
      expect(config.omise.retryAttempts).toBe(3);
      expect(config.omise.retryDelay).toBe(1000);
      
      expect(config.server.name).toBe('omise-mcp-server');
      expect(config.server.version).toBe('1.0.0');
      expect(config.server.description).toBe('MCP Server for Omise Payment Integration');
      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe('localhost');
      
      expect(config.logging.level).toBe('info');
      expect(config.logging.format).toBe('simple');
      expect(config.logging.enableRequestLogging).toBe(false);
      expect(config.logging.enableResponseLogging).toBe(false);
      
      expect(config.rateLimit.enabled).toBe(false);
      expect(config.rateLimit.maxRequests).toBe(100);
      expect(config.rateLimit.windowMs).toBe(60000);
    });

    it('should parse numeric environment variables correctly', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        OMISE_TIMEOUT: '60000',
        OMISE_RETRY_ATTEMPTS: '10',
        OMISE_RETRY_DELAY: '5000',
        PORT: '9000',
        RATE_LIMIT_MAX_REQUESTS: '500',
        RATE_LIMIT_WINDOW_MS: '300000'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.omise.timeout).toBe(60000);
      expect(config.omise.retryAttempts).toBe(10);
      expect(config.omise.retryDelay).toBe(5000);
      expect(config.server.port).toBe(9000);
      expect(config.rateLimit.maxRequests).toBe(500);
      expect(config.rateLimit.windowMs).toBe(300000);
    });

    it('should parse boolean environment variables correctly', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        LOG_REQUESTS: 'true',
        LOG_RESPONSES: 'false',
        RATE_LIMIT_ENABLED: 'true'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.logging.enableRequestLogging).toBe(true);
      expect(config.logging.enableResponseLogging).toBe(false);
      expect(config.rateLimit.enabled).toBe(true);
    });

    it('should handle empty string boolean values as false', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        LOG_REQUESTS: '',
        LOG_RESPONSES: '',
        RATE_LIMIT_ENABLED: ''
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.logging.enableRequestLogging).toBe(false);
      expect(config.logging.enableResponseLogging).toBe(false);
      expect(config.rateLimit.enabled).toBe(false);
    });

    it('should handle undefined boolean values as false', () => {
      // Arrange
      Object.assign(process.env, createValidTestEnv());
      // Don't set LOG_REQUESTS, LOG_RESPONSES, RATE_LIMIT_ENABLED

      // Act
      const config = loadConfig();

      // Assert
      expect(config.logging.enableRequestLogging).toBe(false);
      expect(config.logging.enableResponseLogging).toBe(false);
      expect(config.rateLimit.enabled).toBe(false);
    });
  });

  // ============================================================================
  // Required Environment Variables Validation Tests
  // ============================================================================

  describe('loadConfig - Required Environment Variables', () => {
    it('should throw error when OMISE_PUBLIC_KEY is missing', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: 'test',
        TOOLS: 'all'
      });

      // Act & Assert
      expect(() => loadConfig()).toThrow('Missing required environment variable: OMISE_PUBLIC_KEY');
    });

    it('should throw error when OMISE_SECRET_KEY is missing', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_ENVIRONMENT: 'test',
        TOOLS: 'all'
      });

      // Act & Assert
      expect(() => loadConfig()).toThrow('Missing required environment variable: OMISE_SECRET_KEY');
    });

    it('should throw error when OMISE_ENVIRONMENT is missing', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        TOOLS: 'all'
      });

      // Act & Assert
      expect(() => loadConfig()).toThrow('Missing required environment variable: OMISE_ENVIRONMENT');
    });

    it('should throw error when TOOLS is missing', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: 'test'
      });

      // Act & Assert
      expect(() => loadConfig()).toThrow('Missing required environment variable: TOOLS');
    });

    it('should throw error when TOOLS is empty string', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: 'test',
        TOOLS: ''
      });

      // Act & Assert
      expect(() => loadConfig()).toThrow('Missing required environment variable: TOOLS');
    });

    it('should throw error when TOOLS is whitespace only', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: 'test',
        TOOLS: '   '
      });

      // Act & Assert
      expect(() => loadConfig()).toThrow(
        'TOOLS environment variable is required. ' +
        'Set TOOLS=all for full access, or specify comma-separated tool names. ' +
        'Example: TOOLS=create_charge,list_charges,create_customer'
      );
    });

    it('should accept TOOLS with specific tool names', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: 'test',
        TOOLS: 'create_charge,list_charges,create_customer'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.tools.allowed).toBe('create_charge,list_charges,create_customer');
    });

    it('should accept TOOLS with "all" value', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: 'test',
        TOOLS: 'all'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.tools.allowed).toBe('all');
    });
  });

  // ============================================================================
  // Environment Validation Tests
  // ============================================================================

  describe('loadConfig - Environment Validation', () => {
    it('should accept "test" environment', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: 'test',
        TOOLS: 'all'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.omise.environment).toBe('test');
    });

    it('should accept "production" environment', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_live_1234567890',
        OMISE_SECRET_KEY: 'skey_live_1234567890',
        OMISE_ENVIRONMENT: 'production',
        TOOLS: 'all'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.omise.environment).toBe('production');
    });

    it('should throw error for invalid environment', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: 'staging',
        TOOLS: 'all'
      });

      // Act & Assert
      expect(() => loadConfig()).toThrow('OMISE_ENVIRONMENT must be either "production" or "test"');
    });

    it('should throw error for empty environment', () => {
      // Arrange
      Object.assign(process.env, {
        OMISE_PUBLIC_KEY: 'pkey_test_1234567890',
        OMISE_SECRET_KEY: 'skey_test_1234567890',
        OMISE_ENVIRONMENT: '',
        TOOLS: 'all'
      });

      // Act & Assert
      expect(() => loadConfig()).toThrow('Missing required environment variable: OMISE_ENVIRONMENT');
    });
  });

  // ============================================================================
  // validateOmiseKeys Function Tests
  // ============================================================================

  describe('validateOmiseKeys', () => {
    it('should pass validation for test keys in test environment', () => {
      // Arrange
      const config: ServerConfig = {
        omise: {
          publicKey: 'pkey_test_1234567890',
          secretKey: 'skey_test_1234567890',
          environment: 'test',
          apiVersion: '2017-11-02',
          baseUrl: 'https://api.omise.co',
          vaultUrl: 'https://vault.omise.co',
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
        }
      };

      // Act & Assert
      expect(() => validateOmiseKeys(config)).not.toThrow();
    });

    it('should pass validation for production keys in production environment', () => {
      // Arrange
      const config: ServerConfig = {
        omise: {
          publicKey: 'pkey_live_1234567890',
          secretKey: 'skey_live_1234567890',
          environment: 'production',
          apiVersion: '2017-11-02',
          baseUrl: 'https://api.omise.co',
          vaultUrl: 'https://vault.omise.co',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        server: {
          name: 'prod-server',
          version: '1.0.0',
          description: 'Production server',
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
        }
      };

      // Act & Assert
      expect(() => validateOmiseKeys(config)).not.toThrow();
    });

    it('should allow test keys in production environment', () => {
      // Production environment supports both test keys (for test charges) and live keys (for live charges)
      // Arrange
      const testKeysConfig: ServerConfig = {
        omise: {
          publicKey: 'pkey_test_1234567890',
          secretKey: 'skey_test_1234567890',
          environment: 'production',
          apiVersion: '2017-11-02',
          baseUrl: 'https://api.omise.co',
          vaultUrl: 'https://vault.omise.co',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        server: {
          name: 'prod-server',
          version: '1.0.0',
          description: 'Production server',
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
        }
      };

      // Act & Assert
      expect(() => validateOmiseKeys(testKeysConfig)).not.toThrow();
    });

    it('should throw error for production keys in test environment', () => {
      // Arrange - test all combinations of production keys in test environment
      const config1: ServerConfig = {
        omise: {
          publicKey: 'pkey_live_1234567890',
          secretKey: 'skey_live_1234567890',
          environment: 'test',
          apiVersion: '2017-11-02',
          baseUrl: 'https://api.omise.co',
          vaultUrl: 'https://vault.omise.co',
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
        }
      };

      const config2: ServerConfig = {
        ...config1,
        omise: {
          ...config1.omise,
          publicKey: 'pkey_live_1234567890',
          secretKey: 'skey_test_1234567890' // Production public, test secret
        }
      };

      const config3: ServerConfig = {
        ...config1,
        omise: {
          ...config1.omise,
          publicKey: 'pkey_test_1234567890',
          secretKey: 'skey_live_1234567890' // Test public, production secret
        }
      };

      // Act & Assert
      expect(() => validateOmiseKeys(config1)).toThrow('Live keys should not be used in test environment');
      expect(() => validateOmiseKeys(config2)).toThrow('Live keys should not be used in test environment');
      expect(() => validateOmiseKeys(config3)).toThrow('Live keys should not be used in test environment');
    });
  });

  // ============================================================================
  // getServerInfo Function Tests
  // ============================================================================

  describe('getServerInfo', () => {
    it('should return server info with basic configuration', () => {
      // Arrange
      const config: ServerConfig = {
        omise: {
          publicKey: 'pkey_test_1234567890',
          secretKey: 'skey_test_1234567890',
          environment: 'test',
          apiVersion: '2017-11-02',
          baseUrl: 'https://api.omise.co',
          vaultUrl: 'https://vault.omise.co',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        server: {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test MCP Server',
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
        }
      };

      // Act
      const serverInfo = getServerInfo(config);

      // Assert
      expect(serverInfo).toBeDefined();
      expect(serverInfo.name).toBe('test-server');
      expect(serverInfo.version).toBe('1.0.0');
      expect(serverInfo.description).toBe('Test MCP Server');
      
      expect(serverInfo.capabilities).toBeDefined();
      expect(serverInfo.capabilities.tools).toBeDefined();
      expect(serverInfo.capabilities.resources).toBeDefined();
      
      expect(serverInfo.supportedTools).toBeDefined();
      expect(serverInfo.supportedResources).toBeDefined();
    });

    it('should return correct tools list', () => {
      // Arrange
      const config: ServerConfig = {
        omise: {
          publicKey: 'pkey_test_1234567890',
          secretKey: 'skey_test_1234567890',
          environment: 'test',
          apiVersion: '2017-11-02',
          baseUrl: 'https://api.omise.co',
          vaultUrl: 'https://vault.omise.co',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        server: {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test MCP Server',
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
        }
      };

      // Act
      const serverInfo = getServerInfo(config);

      // Assert
      const expectedTools = [
        'create_charge', 'get_charge',
        'create_customer', 'get_customer',
        'create_token', 'get_token',
        'create_transfer', 'get_transfer',
        'create_recipient', 'get_recipient',
        'create_refund', 'get_refund',
        'create_source', 'get_source',
        'create_schedule', 'get_schedule',
        'get_capability'
      ];
      
      expect(serverInfo.capabilities.tools).toEqual(expectedTools);
      expect(serverInfo.supportedTools).toEqual(expectedTools);
    });

    it('should return correct resources list', () => {
      // Arrange
      const config: ServerConfig = {
        omise: {
          publicKey: 'pkey_test_1234567890',
          secretKey: 'skey_test_1234567890',
          environment: 'test',
          apiVersion: '2017-11-02',
          baseUrl: 'https://api.omise.co',
          vaultUrl: 'https://vault.omise.co',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        server: {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test MCP Server',
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
        }
      };

      // Act
      const serverInfo = getServerInfo(config);

      // Assert
      const expectedResources = [
        'charge', 'customer', 'card', 'token',
        'transfer', 'recipient', 'transaction',
        'refund', 'dispute', 'event', 'schedule',
        'source', 'capability'
      ];
      
      expect(serverInfo.capabilities.resources).toEqual(expectedResources);
      expect(serverInfo.supportedResources).toEqual(expectedResources);
    });

    it('should return server info with custom server configuration', () => {
      // Arrange
      const config: ServerConfig = {
        omise: {
          publicKey: 'pkey_test_1234567890',
          secretKey: 'skey_test_1234567890',
          environment: 'test',
          apiVersion: '2017-11-02',
          baseUrl: 'https://api.omise.co',
          vaultUrl: 'https://vault.omise.co',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        server: {
          name: 'custom-server',
          version: '2.1.0',
          description: 'Custom MCP Server for Omise',
          port: 8080,
          host: '0.0.0.0'
        },
        logging: {
          level: 'debug',
          format: 'json',
          enableRequestLogging: true,
          enableResponseLogging: true
        },
        rateLimit: {
          enabled: true,
          maxRequests: 200,
          windowMs: 120000
        },
        tools: {
          allowed: 'create_charge,list_charges'
        }
      };

      // Act
      const serverInfo = getServerInfo(config);

      // Assert
      expect(serverInfo.name).toBe('custom-server');
      expect(serverInfo.version).toBe('2.1.0');
      expect(serverInfo.description).toBe('Custom MCP Server for Omise');
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling Tests
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle numeric environment variables with invalid values', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        OMISE_TIMEOUT: 'invalid',
        PORT: 'not-a-number',
        RATE_LIMIT_MAX_REQUESTS: 'abc'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.omise.timeout).toBeNaN();
      expect(config.server.port).toBeNaN();
      expect(config.rateLimit.maxRequests).toBeNaN();
    });

    it('should handle zero values for numeric environment variables', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        OMISE_TIMEOUT: '0',
        PORT: '0',
        RATE_LIMIT_MAX_REQUESTS: '0'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.omise.timeout).toBe(0);
      expect(config.server.port).toBe(0);
      expect(config.rateLimit.maxRequests).toBe(0);
    });

    it('should handle negative values for numeric environment variables', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        OMISE_TIMEOUT: '-1000',
        PORT: '-1',
        RATE_LIMIT_MAX_REQUESTS: '-50'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.omise.timeout).toBe(-1000);
      expect(config.server.port).toBe(-1);
      expect(config.rateLimit.maxRequests).toBe(-50);
    });

    it('should handle very large numeric values', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        OMISE_TIMEOUT: '999999999',
        PORT: '65535',
        RATE_LIMIT_MAX_REQUESTS: '1000000'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.omise.timeout).toBe(999999999);
      expect(config.server.port).toBe(65535);
      expect(config.rateLimit.maxRequests).toBe(1000000);
    });

    it('should handle empty string values for optional environment variables', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        SERVER_NAME: '',
        SERVER_VERSION: '',
        SERVER_DESCRIPTION: '',
        HOST: ''
      });

      // Act
      const config = loadConfig();

      // Assert
      // Empty strings are treated as falsy by || operator, so defaults are used
      expect(config.server.name).toBe('omise-mcp-server');
      expect(config.server.version).toBe('1.0.0');
      expect(config.server.description).toBe('MCP Server for Omise Payment Integration');
      expect(config.server.host).toBe('localhost');
    });

    it('should handle special characters in environment variables', () => {
      // Arrange
      Object.assign(process.env, {
        ...createValidTestEnv(),
        SERVER_NAME: 'test-server-123',
        SERVER_DESCRIPTION: 'Test Server with Special Characters: @#$%^&*()',
        HOST: 'localhost.local'
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.server.name).toBe('test-server-123');
      expect(config.server.description).toBe('Test Server with Special Characters: @#$%^&*()');
      expect(config.server.host).toBe('localhost.local');
    });

    it('should handle very long environment variable values', () => {
      // Arrange
      const longDescription = 'A'.repeat(1000);
      Object.assign(process.env, {
        ...createValidTestEnv(),
        SERVER_DESCRIPTION: longDescription
      });

      // Act
      const config = loadConfig();

      // Assert
      expect(config.server.description).toBe(longDescription);
      expect(config.server.description.length).toBe(1000);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    it('should work together: loadConfig -> validateOmiseKeys -> getServerInfo', () => {
      // Arrange
      Object.assign(process.env, createValidTestEnv());

      // Act
      const config = loadConfig();
      validateOmiseKeys(config);
      const serverInfo = getServerInfo(config);

      // Assert
      expect(config).toBeDefined();
      expect(serverInfo).toBeDefined();
      expect(serverInfo.name).toBe(config.server.name);
      expect(serverInfo.version).toBe(config.server.version);
      expect(serverInfo.description).toBe(config.server.description);
    });

    it('should work together with production environment', () => {
      // Arrange
      Object.assign(process.env, createValidProductionEnv());

      // Act
      const config = loadConfig();
      validateOmiseKeys(config);
      const serverInfo = getServerInfo(config);

      // Assert
      expect(config).toBeDefined();
      expect(config.omise.environment).toBe('production');
      expect(serverInfo).toBeDefined();
    });

    it('should handle complete workflow with all optional variables', () => {
      // Arrange
      Object.assign(process.env, createFullEnv());

      // Act
      const config = loadConfig();
      validateOmiseKeys(config);
      const serverInfo = getServerInfo(config);

      // Assert
      expect(config).toBeDefined();
      expect(config.omise.timeout).toBe(45000);
      expect(config.server.port).toBe(8080);
      expect(config.logging.level).toBe('debug');
      expect(config.rateLimit.enabled).toBe(true);
      expect(serverInfo).toBeDefined();
    });
  });
});
