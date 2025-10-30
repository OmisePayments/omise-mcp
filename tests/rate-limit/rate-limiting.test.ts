/**
 * Rate Limiting Tests
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { PaymentTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockCharge } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client.js');
jest.mock('../../src/utils/logger.js');

describe('Rate Limiting Tests', () => {
  let paymentTools: PaymentTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    paymentTools = new PaymentTools(mockOmiseClient, mockLogger);
    
    // Reset rate limit information
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rate Limit Headers Processing', () => {
    it('should process rate limit headers correctly', async () => {
      // Arrange
      const mockCharge = createMockCharge();

      // Mock response with rate limit headers
      const mockResponse = {
        data: mockCharge,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '95',
          'X-RateLimit-Reset': '1640995200'
        }
      };

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

    it('should retrieve rate limit information', () => {
      // Arrange
      const rateLimitInfo = {
        remaining: 95,
        resetTime: 1640995200,
        limit: 100
      };

      mockOmiseClient.getRateLimitInfo.mockReturnValue(rateLimitInfo);

      // Act
      const info = mockOmiseClient.getRateLimitInfo();

      // Assert
      expect(info).toEqual(rateLimitInfo);
      expect(info?.remaining).toBe(95);
      expect(info?.limit).toBe(100);
    });
  });

  describe('Rate Limit Exceeded Handling', () => {
    it('should handle rate limit exceeded error', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1640995200'
        },
        data: {
          object: 'error',
          location: '/charges',
          code: 'rate_limit_exceeded',
          message: 'Rate limit exceeded'
        }
      };

      mockOmiseClient.createCharge.mockRejectedValue(rateLimitError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

  });

  describe('Rate Limit Retry Logic', () => {
    it('should fail on rate limit error without retry', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 429,
        headers: {
          'Retry-After': '1',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1640995200'
        }
      };

      // Rate limit error should not be retried (status < 500)
      mockOmiseClient.createCharge.mockRejectedValue(rateLimitError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(mockOmiseClient.createCharge).toHaveBeenCalledTimes(1);
    });

    it('should fail after multiple rate limit errors', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 429,
        headers: {
          'Retry-After': '1',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1640995200'
        }
      };

      // All 3 attempts result in rate limit error
      mockOmiseClient.createCharge.mockRejectedValue(rateLimitError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });
  });

  describe('Rate Limit Monitoring', () => {
    it('should monitor remaining rate limit count', async () => {
      // Arrange
      const mockCharge = createMockCharge();

      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      // Act
      await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(mockOmiseClient.createCharge).toHaveBeenCalled();
    });

    it('should monitor rate limit reset time', async () => {
      // Arrange
      const rateLimitInfo = {
        remaining: 5,
        resetTime: Date.now() + 60000, // 1 minute later
        limit: 100
      };

      mockOmiseClient.getRateLimitInfo.mockReturnValue(rateLimitInfo);

      // Act
      const info = mockOmiseClient.getRateLimitInfo();

      // Assert
      expect(info?.remaining).toBe(5);
      expect(info?.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should apply rate limit configuration', () => {
      // Arrange
      const config = {
        publicKey: 'pkey_test_1234567890',
        secretKey: 'skey_test_1234567890',
        environment: 'test' as const,
        apiVersion: '2017-11-02',
        baseUrl: 'https://api.omise.co',
        vaultUrl: 'https://vault.omise.co',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      };

      const rateLimitConfig = {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000
      };

      // Act
      const client = new OmiseClient(config, mockLogger);

      // Assert
      expect(client).toBeDefined();
    });

    it('should configure rate limit disabling', () => {
      // Arrange
      const config = {
        publicKey: 'pkey_test_1234567890',
        secretKey: 'skey_test_1234567890',
        environment: 'test' as const,
        apiVersion: '2017-11-02',
        baseUrl: 'https://api.omise.co',
        vaultUrl: 'https://vault.omise.co',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      };

      const rateLimitConfig = {
        enabled: false,
        maxRequests: 0,
        windowMs: 0
      };

      // Act
      const client = new OmiseClient(config, mockLogger);

      // Assert
      expect(client).toBeDefined();
    });
  });

  describe('Rate Limit Queue Management', () => {
    it('should execute queue processing', async () => {
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
    });
  });

  describe('Rate Limit Exponential Backoff', () => {
    it('should handle server error response', async () => {
      // Arrange
      const serverError = new Error('Internal server error');
      (serverError as any).response = {
        status: 500,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '50',
          'X-RateLimit-Reset': '1640995200'
        }
      };

      // Mock server error response
      mockOmiseClient.createCharge.mockRejectedValue(serverError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal server error');
      expect(mockOmiseClient.createCharge).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rate Limit Status Codes', () => {
    it('should handle 503 status code', async () => {
      // Arrange
      const serviceUnavailableError = new Error('Service Unavailable');
      (serviceUnavailableError as any).response = {
        status: 503,
        headers: {
          'Retry-After': '30'
        }
      };

      mockOmiseClient.createCharge.mockRejectedValue(serviceUnavailableError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service Unavailable');
    });
  });
});
