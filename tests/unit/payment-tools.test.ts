/**
 * Payment Tools Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PaymentTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockCharge } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client');
jest.mock('../../src/utils/logger');

describe('PaymentTools', () => {
  let paymentTools: PaymentTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    paymentTools = new PaymentTools(mockOmiseClient, mockLogger);
    jest.clearAllMocks();
  });

  describe('getTools', () => {
    it('should return all payment tools with correct structure', () => {
      // Act
      const tools = paymentTools.getTools();

      // Assert
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for key tools
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('create_charge');
      expect(toolNames).toContain('retrieve_charge');
      expect(toolNames).toContain('list_charges');
      expect(toolNames).toContain('update_charge');
      expect(toolNames).toContain('capture_charge');
      expect(toolNames).toContain('reverse_charge');
      expect(toolNames).toContain('expire_charge');

      // Check tool structure
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
      });
    });
  });

  describe('createCharge', () => {
    it('should create a charge successfully', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        description: 'Test charge',
        capture: true
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharge);
      expect(result.message).toContain('Charge created successfully');
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        description: 'Test charge',
        capture: true
      });
    });

    it('should return error for invalid currency code', async () => {
      // Arrange
      const params = {
        amount: 1000,
        currency: 'INVALID',
        description: 'Test charge'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid currency code');
      expect(mockOmiseClient.createCharge).not.toHaveBeenCalled();
    });

    it('should return error for invalid amount', async () => {
      // Arrange
      const params = {
        amount: -100,
        currency: 'THB',
        description: 'Test charge'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
      expect(mockOmiseClient.createCharge).not.toHaveBeenCalled();
    });

    it('should handle API call errors', async () => {
      // Arrange
      const params = {
        amount: 1000,
        currency: 'THB',
        description: 'Test charge'
      };

      mockOmiseClient.createCharge.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should create charge for partial capture (authorization_type=pre_auth)', async () => {
      // Arrange
      const mockCharge = createMockCharge({
        amount: 260000,
        authorization_type: 'pre_auth',
        authorized_amount: 260000,
        captured_amount: 0,
        capture: false,
        authorized: true,
        capturable: true,
        paid: false
      });
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 260000,
        currency: 'THB',
        card: 'tokn_test_123456789',
        capture: false,
        authorization_type: 'pre_auth'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharge);
      expect(result.message).toContain('Charge created successfully');
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 260000,
        currency: 'THB',
        card: 'tokn_test_123456789',
        capture: false,
        authorization_type: 'pre_auth'
      });
      expect(result.data?.authorization_type).toBe('pre_auth');
      expect(result.data?.authorized_amount).toBe(260000);
      expect(result.data?.captured_amount).toBe(0);
    });

    it('should create charge with lowercase currency (converted to uppercase)', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'thb'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true
      });
    });

    it('should create charge with various valid currencies', async () => {
      // Arrange
      const currencies = ['USD', 'JPY', 'EUR', 'GBP', 'SGD', 'HKD', 'AUD'];
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      for (const currency of currencies) {
        // Act
        const result = await paymentTools.createCharge({
          amount: 1000,
          currency
        });

        // Assert
        expect(result.success).toBe(true);
      }
    });

    it('should create charge with customer ID', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        customer: 'cust_1234567890abcdefgha'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true,
        customer: 'cust_1234567890abcdefgha'
      });
    });

    it('should create charge with card token', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        card: 'tokn_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true,
        card: 'tokn_1234567890abcdefghi'
      });
    });

    it('should create charge with source ID', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        source: 'src_1234567890abcdefgha'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true,
        source: 'src_1234567890abcdefgha'
      });
    });

    it('should create charge with return_uri', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        return_uri: 'https://example.com/callback'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true,
        return_uri: 'https://example.com/callback'
      });
    });

    it('should create charge with metadata', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        metadata: {
          order_id: '123',
          user_id: '456',
          description: 'Test order'
        }
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true,
        metadata: {
          order_id: '123',
          user_id: '456',
          description: 'Test order'
        }
      });
    });

    it('should sanitize metadata - filter out non-primitive values', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        metadata: {
          valid_string: 'string',
          valid_number: 123,
          valid_bool: true,
          valid_null: null,
          invalid_object: { nested: 'value' },
          invalid_array: [1, 2, 3],
          invalid_function: () => {}
        }
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true,
        metadata: {
          valid_string: 'string',
          valid_number: 123,
          valid_bool: true,
          valid_null: null
        }
      });
    });

    it('should create charge with capture=false', async () => {
      // Arrange
      const mockCharge = createMockCharge({ capture: false });
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        capture: false
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: false
      });
    });

    it('should default capture to true when not provided', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true
      });
    });

    it('should return error for zero amount', async () => {
      // Arrange
      const params = {
        amount: 0,
        currency: 'THB'
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
      expect(mockOmiseClient.createCharge).not.toHaveBeenCalled();
    });

    it('should handle null metadata by returning undefined', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        metadata: null
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      // When metadata is null, sanitizeMetadata returns undefined, so it shouldn't be included
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true
      });
    });

    it('should handle empty metadata object by returning undefined', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.createCharge.mockResolvedValue(mockCharge);

      const params = {
        amount: 1000,
        currency: 'THB',
        metadata: {}
      };

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(true);
      // Empty metadata object should return undefined and not be included
      expect(mockOmiseClient.createCharge).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'THB',
        capture: true
      });
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        amount: 1000,
        currency: 'THB'
      };

      mockOmiseClient.createCharge.mockRejectedValue('String error');

      // Act
      const result = await paymentTools.createCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('retrieveCharge', () => {
    it('should retrieve charge successfully', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.getCharge.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.retrieveCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharge);
      expect(mockOmiseClient.getCharge).toHaveBeenCalledWith('chrg_1234567890abcdefghi');
    });

    it('should retrieve charge with test mode ID', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.getCharge.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.retrieveCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.getCharge).toHaveBeenCalledWith('chrg_test_1234567890abcdefghi');
    });

    it('should return error when charge_id is missing', async () => {
      // Arrange
      const params = {};

      // Act
      const result = await paymentTools.retrieveCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.getCharge).not.toHaveBeenCalled();
    });

    it('should return error when charge_id is not a string', async () => {
      // Arrange
      const params = {
        charge_id: 123 as any
      };

      // Act
      const result = await paymentTools.retrieveCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.getCharge).not.toHaveBeenCalled();
    });

    it('should return error for various invalid charge ID formats', async () => {
      // Arrange
      const invalidFormatIds = [
        'invalid_id',
        'chrg_',
        'chrg_123',
        'charge_1234567890abcdefghi',
        'chrg_1234567890ABCDEFGHI', // uppercase
        'chrg_1234567890@#$%^&*()', // special chars
        '1234567890abcdefghi'
      ];

      for (const id of invalidFormatIds) {
        // Act
        const result = await paymentTools.retrieveCharge({ charge_id: id });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid charge ID format');
      }

      // Empty string fails the "required" check, not format
      const result = await paymentTools.retrieveCharge({ charge_id: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');

      expect(mockOmiseClient.getCharge).not.toHaveBeenCalled();
    });

    it('should handle API call errors', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      mockOmiseClient.getCharge.mockRejectedValue(new Error('Charge not found'));

      // Act
      const result = await paymentTools.retrieveCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Charge not found');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      mockOmiseClient.getCharge.mockRejectedValue('String error');

      // Act
      const result = await paymentTools.retrieveCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('listCharges', () => {
    it('should list charges successfully', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [createMockCharge(), createMockCharge()],
        total: 2,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        limit: 20,
        offset: 0
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharges);
      expect(result.message).toContain('Retrieved 2 charges');
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({ limit: 20, offset: 0, order: 'chronological' });
    });

    it('should list charges with default parameters', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      // Act
      const result = await paymentTools.listCharges({});

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({ limit: 20, offset: 0, order: 'chronological' });
    });

    it('should cap limit at maximum of 100', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        order: 'chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        limit: 200
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({ limit: 100, offset: 0, order: 'chronological' });
    });

    it('should handle negative offset by setting to 0', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        offset: -10
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({ limit: 20, offset: 0, order: 'chronological' });
    });

    it('should list charges with reverse_chronological order', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'reverse_chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        order: 'reverse_chronological' as const
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({ limit: 20, offset: 0, order: 'reverse_chronological' });
    });

    it('should list charges with date filters', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        order: 'chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      });
    });

    it('should list charges with status filter', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        status: 'successful' as const
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        order: 'chronological',
        status: 'successful'
      });
    });

    it('should list charges with customer filter', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        customer: 'cust_1234567890abcdefgha'
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        order: 'chronological',
        customer: 'cust_1234567890abcdefgha'
      });
    });

    it('should list charges with card filter', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        card: 'card_1234567890abcdefgha'
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        order: 'chronological',
        card: 'card_1234567890abcdefgha'
      });
    });

    it('should list charges with all filters combined', async () => {
      // Arrange
      const mockCharges = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 50,
        offset: 10,
        order: 'reverse_chronological' as const,
        location: '/charges'
      };
      mockOmiseClient.listCharges.mockResolvedValue(mockCharges);

      const params = {
        limit: 50,
        offset: 10,
        order: 'reverse_chronological' as const,
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        status: 'successful' as const,
        customer: 'cust_1234567890abcdefgha',
        card: 'card_1234567890abcdefgha'
      };

      // Act
      const result = await paymentTools.listCharges(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCharges).toHaveBeenCalledWith(params);
    });

    it('should handle API call errors', async () => {
      // Arrange
      mockOmiseClient.listCharges.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await paymentTools.listCharges({});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      mockOmiseClient.listCharges.mockRejectedValue('String error');

      // Act
      const result = await paymentTools.listCharges({});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('updateCharge', () => {
    it('should update charge successfully', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.put.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        description: 'Updated charge'
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharge);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi', {
        description: 'Updated charge'
      });
    });

    it('should update charge with test mode ID', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.put.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi',
        description: 'Updated charge'
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi', {
        description: 'Updated charge'
      });
    });

    it('should update charge metadata', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.put.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        metadata: {
          order_id: '123',
          user_id: '456'
        }
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi', {
        metadata: {
          order_id: '123',
          user_id: '456'
        }
      });
    });

    it('should sanitize metadata when updating', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.put.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        metadata: {
          valid_string: 'string',
          valid_number: 123,
          valid_bool: true,
          valid_null: null,
          invalid_object: { nested: 'value' },
          invalid_array: [1, 2, 3]
        }
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi', {
        metadata: {
          valid_string: 'string',
          valid_number: 123,
          valid_bool: true,
          valid_null: null
        }
      });
    });

    it('should update charge with empty description', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.put.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        description: ''
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi', {
        description: ''
      });
    });

    it('should update charge with description and metadata', async () => {
      // Arrange
      const mockCharge = createMockCharge();
      mockOmiseClient.put.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        description: 'Updated description',
        metadata: {
          key: 'value'
        }
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi', {
        description: 'Updated description',
        metadata: {
          key: 'value'
        }
      });
    });

    it('should return error when charge_id is missing', async () => {
      // Arrange
      const params = {
        description: 'Updated charge'
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should return error when charge_id is not a string', async () => {
      // Arrange
      const params = {
        charge_id: 123 as any,
        description: 'Updated charge'
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should return error for invalid charge ID format', async () => {
      // Arrange
      const params = {
        charge_id: 'invalid_id',
        description: 'Updated charge'
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid charge ID format');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should return error when no update data provided', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No update data provided');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should handle API call errors', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        description: 'Updated charge'
      };

      mockOmiseClient.put.mockRejectedValue(new Error('Update failed'));

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        description: 'Updated charge'
      };

      mockOmiseClient.put.mockRejectedValue('String error');

      // Act
      const result = await paymentTools.updateCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('captureCharge', () => {
    it('should capture charge successfully', async () => {
      // Arrange
      const mockCharge = createMockCharge({ captured: true });
      mockOmiseClient.post.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharge);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi/capture', {});
    });

    it('should capture charge with test mode ID', async () => {
      // Arrange
      const mockCharge = createMockCharge({ captured: true });
      mockOmiseClient.post.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/capture', {});
    });

    it('should perform partial capture (with capture_amount)', async () => {
      // Arrange
      const mockCharge = createMockCharge({
        amount: 260000,
        authorization_type: 'pre_auth',
        authorized_amount: 260000,
        captured_amount: 12000,
        capture: false,
        authorized: true,
        capturable: false,
        paid: true,
        reversed: true,
        status: 'successful'
      });
      mockOmiseClient.post.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        amount: 12000
      };

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharge);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi/capture', {
        capture_amount: 12000
      });
      expect(result.data?.captured_amount).toBe(12000);
      expect(result.data?.reversed).toBe(true);
    });

    it('should return error when charge_id is missing', async () => {
      // Arrange
      const params = {};

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error when charge_id is not a string', async () => {
      // Arrange
      const params = {
        charge_id: 123 as any
      };

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error for invalid charge ID format', async () => {
      // Arrange
      const params = {
        charge_id: 'invalid_id'
      };

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid charge ID format');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error for zero capture amount', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        amount: 0
      };

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Capture amount must be positive');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error for negative capture amount', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        amount: -100
      };

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Capture amount must be positive');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should handle API call errors', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      mockOmiseClient.post.mockRejectedValue(new Error('Capture failed'));

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Capture failed');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      mockOmiseClient.post.mockRejectedValue('String error');

      // Act
      const result = await paymentTools.captureCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('reverseCharge', () => {
    it('should reverse charge successfully', async () => {
      // Arrange
      const mockCharge = createMockCharge({ reversed: true });
      mockOmiseClient.post.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharge);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi/reverse', {});
    });

    it('should reverse charge with test mode ID', async () => {
      // Arrange
      const mockCharge = createMockCharge({ reversed: true });
      mockOmiseClient.post.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/reverse', {});
    });

    it('should perform partial reverse with amount', async () => {
      // Arrange
      const mockCharge = createMockCharge({ reversed: true });
      mockOmiseClient.post.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        amount: 10000
      };

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi/reverse', {
        amount: 10000
      });
    });

    it('should return error when charge_id is missing', async () => {
      // Arrange
      const params = {};

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error when charge_id is not a string', async () => {
      // Arrange
      const params = {
        charge_id: 123 as any
      };

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error for invalid charge ID format', async () => {
      // Arrange
      const params = {
        charge_id: 'invalid_id'
      };

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid charge ID format');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error for zero reverse amount', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        amount: 0
      };

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Reverse amount must be positive');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error for negative reverse amount', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi',
        amount: -100
      };

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Reverse amount must be positive');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should handle API call errors', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      mockOmiseClient.post.mockRejectedValue(new Error('Reverse failed'));

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Reverse failed');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      mockOmiseClient.post.mockRejectedValue('String error');

      // Act
      const result = await paymentTools.reverseCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('expireCharge', () => {
    it('should expire charge successfully', async () => {
      // Arrange
      const mockCharge = createMockCharge({ expired: true });
      mockOmiseClient.post.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.expireCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCharge);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_1234567890abcdefghi/expire', {});
    });

    it('should expire charge with test mode ID', async () => {
      // Arrange
      const mockCharge = createMockCharge({ expired: true });
      mockOmiseClient.post.mockResolvedValue(mockCharge);

      const params = {
        charge_id: 'chrg_test_1234567890abcdefghi'
      };

      // Act
      const result = await paymentTools.expireCharge(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/charges/chrg_test_1234567890abcdefghi/expire', {});
    });

    it('should return error when charge_id is missing', async () => {
      // Arrange
      const params = {};

      // Act
      const result = await paymentTools.expireCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error when charge_id is not a string', async () => {
      // Arrange
      const params = {
        charge_id: 123 as any
      };

      // Act
      const result = await paymentTools.expireCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should return error for various invalid charge ID formats', async () => {
      // Arrange
      const invalidFormatIds = [
        'invalid_id',
        'chrg_',
        'chrg_123',
        'charge_1234567890abcdefghi',
        'chrg_1234567890ABCDEFGHI', // uppercase
        'chrg_1234567890@#$%^&*()', // special chars
        '1234567890abcdefghi'
      ];

      for (const id of invalidFormatIds) {
        // Act
        const result = await paymentTools.expireCharge({ charge_id: id });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid charge ID format');
      }

      // Empty string fails the "required" check, not format
      const result = await paymentTools.expireCharge({ charge_id: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Charge ID is required');

      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should handle API call errors', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      mockOmiseClient.post.mockRejectedValue(new Error('Expire failed'));

      // Act
      const result = await paymentTools.expireCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Expire failed');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        charge_id: 'chrg_1234567890abcdefghi'
      };

      mockOmiseClient.post.mockRejectedValue('String error');

      // Act
      const result = await paymentTools.expireCharge(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });
});
