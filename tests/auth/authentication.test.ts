/**
 * Authentication and Authorization Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { PaymentTools } from '../../src/tools';
import { createMockCharge } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client.js');
jest.mock('../../src/utils/logger.js');

describe('Authentication Tests', () => {
  let paymentTools: PaymentTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    paymentTools = new PaymentTools(mockOmiseClient, mockLogger);
  });

  describe('API Key Authentication', () => {
    it('Authentication with valid API key', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalled();
    });

    it('Authentication error with invalid API key', async () => {
      // Arrange
      const authError = new Error('Authentication failed');
      (authError as any).response = {
        status: 401,
        data: {
          object: 'error',
          location: '/charges',
          code: 'authentication_failed',
          message: 'Authentication failed'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(authError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('Authentication error with expired API key', async () => {
      // Arrange
      const expiredKeyError = new Error('API key expired');
      (expiredKeyError as any).response = {
        status: 401,
        data: {
          object: 'error',
          location: '/charges',
          code: 'api_key_expired',
          message: 'API key expired'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(expiredKeyError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key expired');
    });
  });

  describe('Environment Key Validation', () => {
    // Unmock OmiseClient for these tests to test actual validation logic
    beforeEach(() => {
      jest.unmock('../../src/utils/omise-client.js');
      jest.resetModules();
    });

    it('Error using test key in production environment', () => {
      // Arrange
      const { OmiseClient: RealOmiseClient } = require('../../src/utils/omise-client.js');
      const { Logger: RealLogger } = require('../../src/utils/logger.js');
      
      const config = {
        publicKey: 'pkey_test_1234567890',
        secretKey: 'skey_test_1234567890',
        environment: 'production' as const,
        apiVersion: '2017-11-02',
        baseUrl: 'https://api.omise.co',
        vaultUrl: 'https://vault.omise.co',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      };

      const logger = new RealLogger({} as any);

      // Act & Assert
      expect(() => {
        new RealOmiseClient(config, logger);
      }).toThrow('Test keys cannot be used in production environment');
    });

    it('Error using production key in test environment', () => {
      // Arrange
      const { OmiseClient: RealOmiseClient } = require('../../src/utils/omise-client.js');
      const { Logger: RealLogger } = require('../../src/utils/logger.js');
      
      const config = {
        publicKey: 'pkey_1234567890',  // Production keys are just pkey_ not pkey_live_
        secretKey: 'skey_1234567890',  // Production keys are just skey_ not skey_live_
        environment: 'test' as const,
        apiVersion: '2017-11-02',
        baseUrl: 'https://api.omise.co',
        vaultUrl: 'https://vault.omise.co',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      };

      const logger = new RealLogger({} as any);

      // Act & Assert
      expect(() => {
        new RealOmiseClient(config, logger);
      }).toThrow('Live keys should not be used in test environment');
    });
  });

  describe('Permission-based Authorization', () => {
    it('Operation restriction with read-only permissions', async () => {
      // Arrange
      const permissionError = new Error('Insufficient permissions');
      (permissionError as any).response = {
        status: 403,
        data: {
          object: 'error',
          location: '/charges',
          code: 'insufficient_permissions',
          message: 'Insufficient permissions'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(permissionError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });

    it('Access permission error for specific resource', async () => {
      // Arrange
      const resourceError = new Error('Resource access denied');
      (resourceError as any).response = {
        status: 403,
        data: {
          object: 'error',
          location: '/charges/restricted',
          code: 'access_denied',
          message: 'Resource access denied'
        }
      };
      mockOmiseClient.getCharge.mockRejectedValue(resourceError);

      // Act
      const result = await paymentTools.retrieveCharge({
        charge_id: createMockCharge().id
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Resource access denied');
    });
  });

  describe('API Key Format Validation', () => {
    // Unmock OmiseClient for these tests to test actual validation logic
    beforeEach(() => {
      jest.unmock('../../src/utils/omise-client.js');
      jest.resetModules();
    });

    it('Validation of invalid public key format', () => {
      // Arrange
      const { OmiseClient: RealOmiseClient } = require('../../src/utils/omise-client.js');
      const { Logger: RealLogger } = require('../../src/utils/logger.js');
      
      const config = {
        publicKey: 'invalid_key_format',
        secretKey: 'skey_test_1234567890',
        environment: 'test' as const,
        apiVersion: '2017-11-02',
        baseUrl: 'https://api.omise.co',
        vaultUrl: 'https://vault.omise.co',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      };

      const logger = new RealLogger({} as any);

      // Act & Assert
      expect(() => {
        new RealOmiseClient(config, logger);
      }).toThrow();
    });

    it('Validation of invalid secret key format', () => {
      // Arrange
      const { OmiseClient: RealOmiseClient } = require('../../src/utils/omise-client.js');
      const { Logger: RealLogger } = require('../../src/utils/logger.js');
      
      const config = {
        publicKey: 'pkey_test_1234567890',
        secretKey: 'invalid_secret_format',
        environment: 'test' as const,
        apiVersion: '2017-11-02',
        baseUrl: 'https://api.omise.co',
        vaultUrl: 'https://vault.omise.co',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      };

      const logger = new RealLogger({} as any);

      // Act & Assert
      expect(() => {
        new RealOmiseClient(config, logger);
      }).toThrow();
    });
  });

  describe('Multi-tenant Authorization', () => {
    it('should handle tenant-specific resource access', async () => {
      // Arrange
      const tenantError = new Error('Tenant access denied');
      (tenantError as any).response = {
        status: 403,
        data: {
          object: 'error',
          location: '/charges',
          code: 'tenant_access_denied',
          message: 'Tenant access denied'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(tenantError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tenant access denied');
    });
  });

  describe('Session-based Authentication', () => {
    it('should handle session expiration error', async () => {
      // Arrange
      const sessionError = new Error('Session expired');
      (sessionError as any).response = {
        status: 401,
        data: {
          object: 'error',
          location: '/charges',
          code: 'session_expired',
          message: 'Session expired'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(sessionError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Session expired');
    });
  });

  describe('OAuth Token Authentication', () => {
    it('should handle OAuth token expiration error', async () => {
      // Arrange
      const tokenError = new Error('Token expired');
      (tokenError as any).response = {
        status: 401,
        data: {
          object: 'error',
          location: '/charges',
          code: 'token_expired',
          message: 'Token expired'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(tokenError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Token expired');
    });

    it('should handle invalid OAuth scope error', async () => {
      // Arrange
      const scopeError = new Error('Insufficient scope');
      (scopeError as any).response = {
        status: 403,
        data: {
          object: 'error',
          location: '/charges',
          code: 'insufficient_scope',
          message: 'Insufficient scope'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(scopeError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient scope');
    });
  });

  describe('IP-based Access Control', () => {
    it('should handle unauthorized IP access error', async () => {
      // Arrange
      const ipError = new Error('IP not allowed');
      (ipError as any).response = {
        status: 403,
        data: {
          object: 'error',
          location: '/charges',
          code: 'ip_not_allowed',
          message: 'IP not allowed'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(ipError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('IP not allowed');
    });
  });
});
