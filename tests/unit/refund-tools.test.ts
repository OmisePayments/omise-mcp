/**
 * Refund Tools Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RefundTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockRefund, createMockCharge } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client');
jest.mock('../../src/utils/logger');

describe('RefundTools', () => {
  let refundTools: RefundTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    refundTools = new RefundTools(mockOmiseClient, mockLogger);
  });

  // ============================================================================
  // Tool Definition Tests
  // ============================================================================

  describe('getTools', () => {
    it('should return correct tool definitions', () => {
      const tools = refundTools.getTools();

      expect(tools).toHaveLength(3);
      
      // Check create_refund tool
      expect(tools[0]).toEqual({
        name: 'create_refund',
        description: 'Create a refund for a charge',
        inputSchema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'Charge ID to refund'
            },
            amount: {
              type: 'number',
              description: 'Refund amount in the smallest currency unit (optional, defaults to full amount)',
              minimum: 1
            },
            reason: {
              type: 'string',
              description: 'Reason for the refund',
              enum: ['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge'],
              default: 'requested_by_customer'
            },
            description: {
              type: 'string',
              description: 'Refund description',
              maxLength: 255
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the refund',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['charge_id']
        }
      });

      // Check retrieve_refund tool
      expect(tools[1]).toEqual({
        name: 'retrieve_refund',
        description: 'Retrieve refund information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            refund_id: {
              type: 'string',
              description: 'Refund ID to retrieve'
            },
            charge_id: {
              type: 'string',
              description: 'Charge ID (optional - if provided, uses nested endpoint /charges/{charge_id}/refunds/{refund_id})'
            }
          },
          required: ['refund_id']
        }
      });

      // Check list_refunds tool
      expect(tools[2]).toEqual({
        name: 'list_refunds',
        description: 'List all refunds with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of refunds to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of refunds to skip (default: 0)',
              minimum: 0,
              default: 0
            },
            order: {
              type: 'string',
              description: 'Order of results',
              enum: ['chronological', 'reverse_chronological'],
              default: 'chronological'
            },
            from: {
              type: 'string',
              description: 'Start date for filtering (ISO 8601 format)',
              format: 'date-time'
            },
            to: {
              type: 'string',
              description: 'End date for filtering (ISO 8601 format)',
              format: 'date-time'
            },
            charge: {
              type: 'string',
              description: 'Filter by charge ID'
            },
            reason: {
              type: 'string',
              description: 'Filter by refund reason',
              enum: ['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge']
            }
          }
        }
      });
    });
  });

  // ============================================================================
  // Validation Function Tests
  // ============================================================================

  describe('validateRefundId', () => {
    it('should validate correct refund ID formats', () => {
      expect((refundTools as any).validateRefundId('rfnd_test_1234567890abcdefghi')).toBe(true);
      expect((refundTools as any).validateRefundId('rfnd_1234567890abcdefghi')).toBe(true);
    });

    it('should reject invalid refund ID formats', () => {
      expect((refundTools as any).validateRefundId('invalid_id')).toBe(false);
      expect((refundTools as any).validateRefundId('rfnd_123')).toBe(false);
      expect((refundTools as any).validateRefundId('rfnd_test_1234567890ABCDEFG')).toBe(false);
      expect((refundTools as any).validateRefundId('')).toBe(false);
    });
  });

  describe('validateChargeId', () => {
    it('should validate correct charge ID formats', () => {
      expect((refundTools as any).validateChargeId('chrg_test_1234567890abcdefghi')).toBe(true);
      expect((refundTools as any).validateChargeId('chrg_1234567890abcdefghi')).toBe(true);
    });

    it('should reject invalid charge ID formats', () => {
      expect((refundTools as any).validateChargeId('invalid_id')).toBe(false);
      expect((refundTools as any).validateChargeId('chrg_123')).toBe(false);
      expect((refundTools as any).validateChargeId('chrg_test_1234567890ABCDEFG')).toBe(false);
      expect((refundTools as any).validateChargeId('')).toBe(false);
    });
  });

  describe('validateRefundReason', () => {
    it('should validate correct refund reasons', () => {
      expect((refundTools as any).validateRefundReason('duplicate')).toBe(true);
      expect((refundTools as any).validateRefundReason('fraudulent')).toBe(true);
      expect((refundTools as any).validateRefundReason('requested_by_customer')).toBe(true);
      expect((refundTools as any).validateRefundReason('expired_uncaptured_charge')).toBe(true);
    });

    it('should reject invalid refund reasons', () => {
      expect((refundTools as any).validateRefundReason('invalid_reason')).toBe(false);
      expect((refundTools as any).validateRefundReason('')).toBe(false);
    });
  });

  describe('validateRefundAmount', () => {
    it('should validate correct refund amounts', () => {
      expect((refundTools as any).validateRefundAmount(1000, 5000)).toBe(true);
      expect((refundTools as any).validateRefundAmount(5000, 5000)).toBe(true);
    });

    it('should reject invalid refund amounts', () => {
      expect((refundTools as any).validateRefundAmount(0, 5000)).toBe(false);
      expect((refundTools as any).validateRefundAmount(-100, 5000)).toBe(false);
      expect((refundTools as any).validateRefundAmount(6000, 5000)).toBe(false);
    });
  });

  describe('sanitizeMetadata', () => {
    it('should sanitize valid metadata', () => {
      const metadata = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null
      };
      const result = (refundTools as any).sanitizeMetadata(metadata);
      expect(result).toEqual(metadata);
    });

    it('should filter out invalid metadata types', () => {
      const metadata = {
        string: 'test',
        object: { nested: 'value' },
        array: [1, 2, 3],
        function: () => {},
        undefined: undefined
      };
      const result = (refundTools as any).sanitizeMetadata(metadata);
      expect(result).toEqual({ string: 'test' });
    });

    it('should return undefined for invalid input', () => {
      expect((refundTools as any).sanitizeMetadata(null)).toBeUndefined();
      expect((refundTools as any).sanitizeMetadata('string')).toBeUndefined();
      expect((refundTools as any).sanitizeMetadata(123)).toBeUndefined();
    });

    it('should return undefined for empty metadata', () => {
      const result = (refundTools as any).sanitizeMetadata({});
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // Main Tool Implementation Tests
  // ============================================================================

  describe('createRefund', () => {
    it('should create a refund successfully with full amount', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockRefund = createMockRefund({ amount: 5000 });
      const mockExistingRefunds = { data: [], total: 0 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);
      mockOmiseClient.post.mockResolvedValue(mockRefund);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi',
        reason: 'requested_by_customer',
        description: 'Test refund'
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRefund);
      expect(result.message).toContain('Refund created successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds');
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        amount: 5000,
        reason: 'requested_by_customer',
        description: 'Test refund',
        metadata: undefined
      });
    });

    it('should create a refund successfully with partial amount', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockRefund = createMockRefund({ amount: 2000 });
      const mockExistingRefunds = { data: [], total: 0 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);
      mockOmiseClient.post.mockResolvedValue(mockRefund);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi',
        amount: 2000,
        reason: 'duplicate'
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRefund);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        amount: 2000,
        reason: 'duplicate',
        description: undefined,
        metadata: undefined
      });
    });

    it('should handle existing refunds correctly', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockExistingRefund = createMockRefund({ amount: 2000 });
      const mockNewRefund = createMockRefund({ amount: 2000 });
      const mockExistingRefunds = { data: [mockExistingRefund], total: 1 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);
      mockOmiseClient.post.mockResolvedValue(mockNewRefund);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi',
        amount: 2000
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        amount: 2000,
        reason: 'requested_by_customer',
        description: undefined,
        metadata: undefined
      });
    });

    it('should fail with invalid charge ID', async () => {
      // Arrange
      const params = {
        charge_id: 'invalid_id',
        amount: 1000
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid charge ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail with invalid refund reason', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi',
        reason: 'invalid_reason'
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refund reason');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail when charge retrieval fails', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      mockOmiseClient.get.mockRejectedValue(new Error('Charge not found'));

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve charge information');
    });

    it('should fail when no refundable amount available', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockExistingRefund = createMockRefund({ amount: 5000 });
      const mockExistingRefunds = { data: [mockExistingRefund], total: 1 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No refundable amount available');
    });

    it('should fail with invalid refund amount', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockExistingRefunds = { data: [], total: 0 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi',
        amount: 6000
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refund amount');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockExistingRefunds = { data: [], total: 0 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);
      mockOmiseClient.post.mockRejectedValue(new Error('API Error'));

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockExistingRefunds = { data: [], total: 0 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);
      mockOmiseClient.post.mockRejectedValue('String error');

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should sanitize metadata correctly', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockRefund = createMockRefund({ amount: 5000 });
      const mockExistingRefunds = { data: [], total: 0 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);
      mockOmiseClient.post.mockResolvedValue(mockRefund);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi',
        metadata: {
          valid: 'test',
          invalid: { nested: 'object' },
          number: 123
        }
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        amount: 5000,
        reason: 'requested_by_customer',
        description: undefined,
        metadata: {
          valid: 'test',
          number: 123
        }
      });
    });
  });

  describe('retrieveRefund', () => {
    it('should retrieve refund using direct endpoint', async () => {
      // Arrange
      const mockRefund = createMockRefund();
      mockOmiseClient.get.mockResolvedValue(mockRefund);

      const params = {
        refund_id: 'rfnd_test_1234567890abcdefghi'
      };

      // Act
      const result = await refundTools.retrieveRefund(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRefund);
      expect(result.message).toContain('Refund retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/refunds/rfnd_test_1234567890abcdefghi');
    });

    it('should retrieve refund using nested endpoint', async () => {
      // Arrange
      const mockRefund = createMockRefund();
      mockOmiseClient.get.mockResolvedValue(mockRefund);

      const params = {
        refund_id: 'rfnd_test_1234567890abcdefghi',
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await refundTools.retrieveRefund(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRefund);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds/rfnd_test_1234567890abcdefghi');
    });

    it('should fail with invalid refund ID', async () => {
      // Arrange
      const params = {
        refund_id: 'invalid_id'
      };

      // Act
      const result = await refundTools.retrieveRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refund ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail with invalid charge ID when using nested endpoint', async () => {
      // Arrange
      const params = {
        refund_id: 'rfnd_test_1234567890abcdefghi',
        charge_id: 'invalid_id'
      };

      // Act
      const result = await refundTools.retrieveRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid charge ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const params = {
        refund_id: 'rfnd_test_1234567890abcdefghi'
      };

      mockOmiseClient.get.mockRejectedValue(new Error('Refund not found'));

      // Act
      const result = await refundTools.retrieveRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Refund not found');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        refund_id: 'rfnd_test_1234567890abcdefghi'
      };

      mockOmiseClient.get.mockRejectedValue({ code: 'error_code' });

      // Act
      const result = await refundTools.retrieveRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('listRefunds', () => {
    it('should list refunds using direct endpoint', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [createMockRefund(), createMockRefund()],
        total: 2,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {
        limit: 20,
        offset: 0,
        order: 'chronological'
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRefunds);
      expect(result.message).toContain('Retrieved 2 refunds');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/refunds', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should list refunds using nested endpoint', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [createMockRefund()],
        total: 1,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/charges/chrg_test_1234567890abcdefghi/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {
        charge: 'chrg_test_1234567890abcdefghi',
        limit: 20
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRefunds);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should list refunds using nested endpoint without limit (defaults to 20)', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/charges/chrg_test_1234567890abcdefghi/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {
        charge: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should list refunds using nested endpoint with all filter parameters', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [createMockRefund()],
        total: 1,
        limit: 10,
        offset: 0,
        order: 'reverse_chronological',
        location: '/charges/chrg_test_1234567890abcdefghi/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {
        charge: 'chrg_test_1234567890abcdefghi',
        limit: 10,
        offset: 0,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        reason: 'duplicate'
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        limit: 10,
        offset: 0,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        reason: 'duplicate'
      });
    });

    it('should handle limit 100 when using nested endpoint', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        order: 'chronological',
        location: '/charges/chrg_test_1234567890abcdefghi/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {
        charge: 'chrg_test_1234567890abcdefghi',
        limit: 100
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        limit: 100,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should handle filtering parameters', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        order: 'reverse_chronological',
        location: '/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {
        limit: 10,
        offset: 20,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        reason: 'duplicate'
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/refunds', {
        limit: 10,
        offset: 20,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        reason: 'duplicate'
      });
    });

    it('should enforce limit maximum', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        order: 'chronological',
        location: '/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {
        limit: 150 // Should be capped at 100
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/refunds', {
        limit: 100,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should enforce offset minimum', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {
        offset: -10 // Should be capped at 0
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/refunds', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should fail with invalid charge ID when using nested endpoint', async () => {
      // Arrange
      const params = {
        charge: 'invalid_id'
      };

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid charge ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const params = {
        limit: 20
      };

      mockOmiseClient.get.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        limit: 20
      };

      mockOmiseClient.get.mockRejectedValue(null);

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration scenarios', () => {
    it('should handle complete refund workflow', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 10000 });
      const mockRefund = createMockRefund({ amount: 5000 });
      const mockExistingRefunds = { data: [], total: 0 };
      const mockRefundList = {
        object: 'list',
        data: [mockRefund],
        total: 1,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/refunds'
      };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds)
        .mockResolvedValueOnce(mockRefund)
        .mockResolvedValueOnce(mockRefundList);
      mockOmiseClient.post.mockResolvedValue(mockRefund);

      // Act - Create refund
      const createResult = await refundTools.createRefund({
        charge_id: 'chrg_test_1234567890abcdefghi',
        amount: 5000,
        reason: 'requested_by_customer'
      });

      // Act - Retrieve refund
      const retrieveResult = await refundTools.retrieveRefund({
        refund_id: mockRefund.id
      });

      // Act - List refunds
      const listResult = await refundTools.listRefunds({
        limit: 20
      });

      // Assert
      expect(createResult.success).toBe(true);
      expect(retrieveResult.success).toBe(true);
      expect(listResult.success).toBe(true);
      expect(listResult.data.data).toHaveLength(1);
    });

    it('should handle partial refund scenario', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 10000 });
      const mockFirstRefund = createMockRefund({ amount: 3000 });
      const mockSecondRefund = createMockRefund({ amount: 2000 });
      const mockExistingRefunds = { data: [mockFirstRefund], total: 1 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);
      mockOmiseClient.post.mockResolvedValue(mockSecondRefund);

      // Act - Create second partial refund
      const result = await refundTools.createRefund({
        charge_id: 'chrg_test_1234567890abcdefghi',
        amount: 2000
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        amount: 2000,
        reason: 'requested_by_customer',
        description: undefined,
        metadata: undefined
      });
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle empty refund list', async () => {
      // Arrange
      const mockRefunds = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/refunds'
      };
      mockOmiseClient.get.mockResolvedValue(mockRefunds);

      const params = {};

      // Act
      const result = await refundTools.listRefunds(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.data).toEqual([]);
      expect(result.message).toContain('Retrieved 0 refunds');
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      mockOmiseClient.get.mockRejectedValue('Unknown error');

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve charge information');
    });

    it('should handle null/undefined metadata gracefully', async () => {
      // Arrange
      const mockCharge = createMockCharge({ amount: 5000 });
      const mockRefund = createMockRefund({ amount: 5000 });
      const mockExistingRefunds = { data: [], total: 0 };

      mockOmiseClient.get
        .mockResolvedValueOnce(mockCharge)
        .mockResolvedValueOnce(mockExistingRefunds);
      mockOmiseClient.post.mockResolvedValue(mockRefund);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi',
        metadata: null
      };

      // Act
      const result = await refundTools.createRefund(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/refunds', {
        amount: 5000,
        reason: 'requested_by_customer',
        description: undefined,
        metadata: undefined
      });
    });
  });
});
