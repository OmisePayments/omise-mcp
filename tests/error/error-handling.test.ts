/**
 * Error Handling Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PaymentTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockCharge } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client.js');
jest.mock('../../src/utils/logger.js');

describe('Error Handling Tests', () => {
  let paymentTools: PaymentTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    paymentTools = new PaymentTools(mockOmiseClient, mockLogger);
  });

  describe('API Error Handling', () => {
    it('should handle 404 Not Found error', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      const notFoundError = new Error('Charge not found');
      (notFoundError as any).response = {
        status: 404,
        data: {
          object: 'error',
          location: '/charges/nonexistent',
          code: 'not_found',
          message: 'Charge not found'
        }
      };
      mockOmiseClient.getCharge.mockRejectedValue(notFoundError);

      // Act
      const result = await paymentTools.retrieveCharge({
        charge_id: mockCharge.id
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge not found');
    });

    it('should handle 400 Bad Request error', async () => {
      // Arrange
      const badRequestError = new Error('Invalid card information');
      (badRequestError as any).response = {
        status: 400,
        data: {
          object: 'error',
          location: '/charges',
          code: 'invalid_card',
          message: 'Invalid card information'
        }
      };
      mockOmiseClient.createCharge.mockRejectedValue(badRequestError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid card information');
    });

    it('should handle 500 Internal Server Error', async () => {
      // Arrange
      const serverError = new Error('Internal server error');
      (serverError as any).response = {
        status: 500,
        data: {
          object: 'error',
          location: '/charges',
          code: 'internal_server_error',
          message: 'Internal server error'
        }
      };
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
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network timeout error', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      mockOmiseClient.createCharge.mockRejectedValue(timeoutError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
    });

    it('should handle network connection error', async () => {
      // Arrange
      const connectionError = new Error('Network error');
      (connectionError as any).code = 'ENOTFOUND';
      mockOmiseClient.createCharge.mockRejectedValue(connectionError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle invalid currency code', async () => {
      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'INVALID',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid currency code');
      expect(mockOmiseClient.createCharge).not.toHaveBeenCalled();
    });

    it('should handle invalid amount', async () => {
      // Act
      const result = await paymentTools.createCharge({
        amount: -100,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
      expect(mockOmiseClient.createCharge).not.toHaveBeenCalled();
    });

    it('should handle invalid charge ID', async () => {
      // Act
      const result = await paymentTools.retrieveCharge({
        charge_id: 'invalid_id'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid charge ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });
  });

  describe('Unexpected Error Handling', () => {
    it('should handle unexpected error', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected error');
      mockOmiseClient.createCharge.mockRejectedValue(unexpectedError);

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });

    it('should handle non-Error object exception', async () => {
      // Arrange
      mockOmiseClient.createCharge.mockRejectedValue('String error');

      // Act
      const result = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Partial Error Handling', () => {
    it('should handle partial update error', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      const partialError = new Error('Partial update failed');
      mockOmiseClient.put.mockRejectedValue(partialError);

      // Act
      const result = await paymentTools.updateCharge({
        charge_id: mockCharge.id,
        description: 'Updated description'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Partial update failed');
    });
  });

  describe('Error Logging', () => {
    it('should verify error logging output', async () => {
      // Arrange
      const testError = new Error('Test error for logging');
      mockOmiseClient.createCharge.mockRejectedValue(testError);

      // Act
      await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      });

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create charge via MCP tool',
        testError,
        expect.any(Object)
      );
    });
  });
});
