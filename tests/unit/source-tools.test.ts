/**
 * Source Tools Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SourceTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockSource } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client');
jest.mock('../../src/utils/logger');

describe('SourceTools', () => {
  let sourceTools: SourceTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    sourceTools = new SourceTools(mockOmiseClient, mockLogger);
  });

  describe('getTools', () => {
    it('should return correct tool definitions', () => {
      const tools = sourceTools.getTools();
      
      expect(tools).toHaveLength(2);
      expect(tools[0]?.name).toBe('create_source');
      expect(tools[1]?.name).toBe('retrieve_source');
      
      // Check create_source tool schema
      expect(tools[0]?.inputSchema.properties).toBeDefined();
      expect(tools[0]?.inputSchema.properties).toHaveProperty('type');
      expect(tools[0]?.inputSchema.properties).toHaveProperty('amount');
      expect(tools[0]?.inputSchema.properties).toHaveProperty('currency');
      expect(tools[0]?.inputSchema.required).toEqual(['type', 'amount', 'currency']);
      
      // Check retrieve_source tool schema
      expect(tools[1]?.inputSchema.properties).toBeDefined();
      expect(tools[1]?.inputSchema.properties).toHaveProperty('source_id');
      expect(tools[1]?.inputSchema.required).toEqual(['source_id']);
    });
  });

  describe('createSource', () => {
    it('should create a basic source successfully', async () => {
      // Arrange
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'scb'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSource);
      expect(result.message).toContain('Source created successfully');
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        return_uri: undefined,
        metadata: undefined,
        bank: 'scb'
      });
    });

    it('should create source with all optional parameters', async () => {
      // Arrange
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'scb',
        return_uri: 'https://example.com/return',
        metadata: { order_id: '12345', customer_name: 'John Doe' }
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSource);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        return_uri: 'https://example.com/return',
        metadata: { order_id: '12345', customer_name: 'John Doe' },
        bank: 'scb'
      });
    });

    it('should create internet banking source with bank parameter', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'internet_banking_ktb' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'internet_banking_ktb',
        amount: 2000,
        currency: 'THB',
        bank: 'ktb'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'internet_banking_ktb',
        amount: 2000,
        currency: 'THB',
        bank: 'ktb'
      }));
    });

    it('should create internet banking BBL source', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'internet_banking_bbl' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'internet_banking_bbl',
        amount: 2500,
        currency: 'THB',
        bank: 'bbl'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'internet_banking_bbl',
        amount: 2500,
        currency: 'THB',
        bank: 'bbl'
      }));
    });

    it('should create internet banking BAY source', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'internet_banking_bay' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'internet_banking_bay',
        amount: 3000,
        currency: 'THB',
        bank: 'bay'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'internet_banking_bay',
        amount: 3000,
        currency: 'THB',
        bank: 'bay'
      }));
    });

    it('should create Alipay source with platform_type', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'alipay' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'alipay',
        amount: 3000,
        currency: 'THB',
        platform_type: 'ios'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'alipay',
        amount: 3000,
        currency: 'THB',
        platform_type: 'ios'
      }));
    });

    it('should create Alipay source without platform_type (optional)', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'alipay' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'alipay',
        amount: 3000,
        currency: 'THB'
        // platform_type not provided (should pass validation)
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'alipay',
        amount: 3000,
        currency: 'THB'
      }));
    });

    it('should create Alipay CN source', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'alipay_cn' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'alipay_cn',
        amount: 4000,
        currency: 'THB',
        platform_type: 'android'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'alipay_cn',
        amount: 4000,
        currency: 'THB',
        platform_type: 'android'
      }));
    });

    it('should create Alipay HK source', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'alipay_hk' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'alipay_hk',
        amount: 5000,
        currency: 'THB',
        platform_type: 'web'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'alipay_hk',
        amount: 5000,
        currency: 'THB',
        platform_type: 'web'
      }));
    });

    it('should create convenience store source with store parameter', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'convenience_store' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'convenience_store',
        amount: 1500,
        currency: 'THB',
        store: '7eleven'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'convenience_store',
        amount: 1500,
        currency: 'THB',
        store: '7eleven'
      }));
    });

    it('should create convenience store source without store parameter (optional)', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'convenience_store' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'convenience_store',
        amount: 1500,
        currency: 'THB'
        // store not provided (should pass validation)
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'convenience_store',
        amount: 1500,
        currency: 'THB'
      }));
    });

    it('should create installment source with installment_term', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'installment_bay' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'installment_bay',
        amount: 10000,
        currency: 'THB',
        installment_term: 12
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'installment_bay',
        amount: 10000,
        currency: 'THB',
        installment_term: 12
      }));
    });

    it('should create PromptPay source with mobile_number', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'promptpay' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'promptpay',
        amount: 500,
        currency: 'THB',
        mobile_number: '0812345678'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'promptpay',
        amount: 500,
        currency: 'THB',
        mobile_number: '0812345678'
      }));
    });

    it('should create PromptPay source with national_id', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'promptpay' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'promptpay',
        amount: 500,
        currency: 'THB',
        national_id: '1234567890123'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'promptpay',
        amount: 500,
        currency: 'THB',
        national_id: '1234567890123'
      }));
    });

    it('should create TrueMoney source with phone_number', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'truemoney' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'truemoney',
        amount: 750,
        currency: 'THB',
        phone_number: '0812345678'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        type: 'truemoney',
        amount: 750,
        currency: 'THB',
        phone_number: '0812345678'
      }));
    });

    it('should handle currency case conversion', async () => {
      // Arrange
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'thb', // lowercase
        bank: 'scb'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        currency: 'THB' // should be uppercase
      }));
    });

    it('should sanitize metadata correctly', async () => {
      // Arrange
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'scb',
        metadata: {
          valid_string: 'test',
          valid_number: 123,
          valid_boolean: true,
          invalid_object: { nested: 'value' },
          invalid_function: () => {},
          null_value: null
        }
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        metadata: {
          valid_string: 'test',
          valid_number: 123,
          valid_boolean: true,
          null_value: null
        }
      }));
    });

    it('should fail with invalid currency', async () => {
      // Arrange
      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'INVALID',
        bank: 'scb'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid currency code');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail with invalid amount', async () => {
      // Arrange
      const params = {
        type: 'internet_banking_scb',
        amount: 0,
        currency: 'THB',
        bank: 'scb'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail with negative amount', async () => {
      // Arrange
      const params = {
        type: 'internet_banking_scb',
        amount: -100,
        currency: 'THB',
        bank: 'scb'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail internet banking without bank parameter', async () => {
      // Arrange
      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB'
        // missing bank parameter
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bank code is required for internet banking');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail internet banking with invalid bank code', async () => {
      // Arrange
      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'invalid_bank'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid bank code');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail Alipay with invalid platform_type', async () => {
      // Arrange
      const params = {
        type: 'alipay',
        amount: 1000,
        currency: 'THB',
        platform_type: 'invalid_platform'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid platform type for Alipay');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail convenience store with invalid store', async () => {
      // Arrange
      const params = {
        type: 'convenience_store',
        amount: 1000,
        currency: 'THB',
        store: 'invalid_store'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid convenience store chain');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail installment without installment_term', async () => {
      // Arrange
      const params = {
        type: 'installment_bay',
        amount: 1000,
        currency: 'THB'
        // missing installment_term
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Installment term is required for installment payments');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail installment with invalid installment_term', async () => {
      // Arrange
      const params = {
        type: 'installment_bay',
        amount: 1000,
        currency: 'THB',
        installment_term: 5 // invalid term
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid installment term');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail PromptPay without mobile_number or national_id', async () => {
      // Arrange
      const params = {
        type: 'promptpay',
        amount: 1000,
        currency: 'THB'
        // missing both mobile_number and national_id
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Mobile number or National ID is required for PromptPay');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail PromptPay with invalid mobile_number format', async () => {
      // Arrange
      const params = {
        type: 'promptpay',
        amount: 1000,
        currency: 'THB',
        mobile_number: '123' // invalid format
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid mobile number format');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail PromptPay with invalid national_id format', async () => {
      // Arrange
      const params = {
        type: 'promptpay',
        amount: 1000,
        currency: 'THB',
        national_id: '123' // invalid format
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid National ID format');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail TrueMoney without phone_number', async () => {
      // Arrange
      const params = {
        type: 'truemoney',
        amount: 1000,
        currency: 'THB'
        // missing phone_number
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Phone number is required for TrueMoney');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail TrueMoney with invalid phone_number format', async () => {
      // Arrange
      const params = {
        type: 'truemoney',
        amount: 1000,
        currency: 'THB',
        phone_number: '123' // invalid format
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number format');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'scb'
      };

      mockOmiseClient.post.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle unknown error', async () => {
      // Arrange
      const params = {
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'scb'
      };

      mockOmiseClient.post.mockRejectedValue('Unknown error');

      // Act
      const result = await sourceTools.createSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should handle unknown payment type that falls through switch', async () => {
      // Arrange
      const mockSource = createMockSource({ type: 'unknown_type' });
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const params = {
        type: 'unknown_payment_type',
        amount: 1000,
        currency: 'THB'
      };

      // Act
      const result = await sourceTools.createSource(params);

      // Assert - should pass validation (falls through switch) but may fail at API
      // The switch statement doesn't have a default case, so unknown types return valid: true
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalled();
    });
  });

  describe('retrieveSource', () => {
    it('should retrieve a source successfully', async () => {
      // Arrange
      const mockSource = createMockSource();
      mockOmiseClient.get.mockResolvedValue(mockSource);

      const params = {
        source_id: 'src_1234567890abcdefgha'
      };

      // Act
      const result = await sourceTools.retrieveSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSource);
      expect(result.message).toContain('Source retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/sources/src_1234567890abcdefgha');
    });

    it('should retrieve test source successfully', async () => {
      // Arrange
      const mockSource = createMockSource();
      mockOmiseClient.get.mockResolvedValue(mockSource);

      const params = {
        source_id: 'src_test_1234567890abcdefgha'
      };

      // Act
      const result = await sourceTools.retrieveSource(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSource);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/sources/src_test_1234567890abcdefgha');
    });

    it('should fail with invalid source ID format', async () => {
      // Arrange
      const params = {
        source_id: 'invalid_id'
      };

      // Act
      const result = await sourceTools.retrieveSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid source ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail with source ID too short', async () => {
      // Arrange
      const params = {
        source_id: 'src_123'
      };

      // Act
      const result = await sourceTools.retrieveSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid source ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail with source ID too long', async () => {
      // Arrange
      const params = {
        source_id: 'src_1234567890abcdefghijklmnop'
      };

      // Act
      const result = await sourceTools.retrieveSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid source ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail with uppercase source ID', async () => {
      // Arrange
      const params = {
        source_id: 'SRC_1234567890ABCDEFGHA'
      };

      // Act
      const result = await sourceTools.retrieveSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid source ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        source_id: 'src_1234567890abcdefgha'
      };

      mockOmiseClient.get.mockRejectedValue(new Error('Source not found'));

      // Act
      const result = await sourceTools.retrieveSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Source not found');
    });

    it('should handle unknown error', async () => {
      // Arrange
      const params = {
        source_id: 'src_1234567890abcdefgha'
      };

      mockOmiseClient.get.mockRejectedValue('Unknown error');

      // Act
      const result = await sourceTools.retrieveSource(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Validation Functions', () => {
    // Test validateSourceId indirectly through retrieveSource
    describe('validateSourceId', () => {
      it('should accept valid production source ID', async () => {
        const mockSource = createMockSource();
        mockOmiseClient.get.mockResolvedValue(mockSource);

        const result = await sourceTools.retrieveSource({
          source_id: 'src_1234567890abcdefgha'
        });

        expect(result.success).toBe(true);
      });

      it('should accept valid test source ID', async () => {
        const mockSource = createMockSource();
        mockOmiseClient.get.mockResolvedValue(mockSource);

        const result = await sourceTools.retrieveSource({
          source_id: 'src_test_1234567890abcdefgha'
        });

        expect(result.success).toBe(true);
      });
    });

    // Test validateCurrency indirectly through createSource
    describe('validateCurrency', () => {
      const validCurrencies = ['THB', 'USD', 'JPY', 'EUR', 'GBP', 'SGD', 'HKD', 'AUD', 'CAD', 'CHF', 'CNY'];
      
      validCurrencies.forEach(currency => {
        it(`should accept valid currency: ${currency}`, async () => {
          const mockSource = createMockSource();
          mockOmiseClient.post.mockResolvedValue(mockSource);

          const result = await sourceTools.createSource({
            type: 'internet_banking_scb',
            amount: 1000,
            currency: currency,
            bank: 'scb'
          });

          expect(result.success).toBe(true);
        });

        it(`should accept lowercase currency: ${currency.toLowerCase()}`, async () => {
          const mockSource = createMockSource();
          mockOmiseClient.post.mockResolvedValue(mockSource);

          const result = await sourceTools.createSource({
            type: 'internet_banking_scb',
            amount: 1000,
            currency: currency.toLowerCase(),
            bank: 'scb'
          });

          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid currency', async () => {
        const result = await sourceTools.createSource({
          type: 'internet_banking_scb',
          amount: 1000,
          currency: 'INVALID',
          bank: 'scb'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid currency code');
      });
    });

    // Test validateAmount indirectly through createSource
    describe('validateAmount', () => {
      it('should accept positive amounts', async () => {
        const mockSource = createMockSource();
        mockOmiseClient.post.mockResolvedValue(mockSource);

        const result = await sourceTools.createSource({
          type: 'internet_banking_scb',
          amount: 1,
          currency: 'THB',
          bank: 'scb'
        });

        expect(result.success).toBe(true);
      });

      it('should reject zero amount', async () => {
        const result = await sourceTools.createSource({
          type: 'internet_banking_scb',
          amount: 0,
          currency: 'THB',
          bank: 'scb'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid amount');
      });

      it('should reject negative amount', async () => {
        const result = await sourceTools.createSource({
          type: 'internet_banking_scb',
          amount: -100,
          currency: 'THB',
          bank: 'scb'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid amount');
      });
    });

    // Test validatePaymentMethod indirectly through createSource
    describe('validatePaymentMethod', () => {
      const validBanks = ['bbl', 'ktb', 'scb', 'bay', 'bcc', 'cimb', 'uob', 'tisco', 'kk', 'tmb'];
      
      validBanks.forEach(bank => {
        it(`should accept valid bank: ${bank}`, async () => {
          const mockSource = createMockSource();
          mockOmiseClient.post.mockResolvedValue(mockSource);

          const result = await sourceTools.createSource({
            type: 'internet_banking_scb',
            amount: 1000,
            currency: 'THB',
            bank: bank
          });

          expect(result.success).toBe(true);
        });
      });

      const validPlatformTypes = ['ios', 'android', 'web'];
      
      validPlatformTypes.forEach(platform => {
        it(`should accept valid Alipay platform: ${platform}`, async () => {
          const mockSource = createMockSource();
          mockOmiseClient.post.mockResolvedValue(mockSource);

          const result = await sourceTools.createSource({
            type: 'alipay',
            amount: 1000,
            currency: 'THB',
            platform_type: platform
          });

          expect(result.success).toBe(true);
        });
      });

      const validStores = ['7eleven', 'family_mart', 'ministop', 'lawson'];
      
      validStores.forEach(store => {
        it(`should accept valid convenience store: ${store}`, async () => {
          const mockSource = createMockSource();
          mockOmiseClient.post.mockResolvedValue(mockSource);

          const result = await sourceTools.createSource({
            type: 'convenience_store',
            amount: 1000,
            currency: 'THB',
            store: store
          });

          expect(result.success).toBe(true);
        });
      });

      const validInstallmentTerms = [3, 6, 9, 10, 12, 18, 24, 36];
      
      validInstallmentTerms.forEach(term => {
        it(`should accept valid installment term: ${term}`, async () => {
          const mockSource = createMockSource();
          mockOmiseClient.post.mockResolvedValue(mockSource);

          const result = await sourceTools.createSource({
            type: 'installment_bay',
            amount: 1000,
            currency: 'THB',
            installment_term: term
          });

          expect(result.success).toBe(true);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metadata', async () => {
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const result = await sourceTools.createSource({
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'scb',
        metadata: {}
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        metadata: undefined
      }));
    });

    it('should handle null metadata', async () => {
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const result = await sourceTools.createSource({
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'scb',
        metadata: null
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        metadata: undefined
      }));
    });

    it('should handle undefined metadata', async () => {
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const result = await sourceTools.createSource({
        type: 'internet_banking_scb',
        amount: 1000,
        currency: 'THB',
        bank: 'scb'
        // metadata not provided
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/sources', expect.objectContaining({
        metadata: undefined
      }));
    });

    it('should handle very large amounts', async () => {
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const result = await sourceTools.createSource({
        type: 'internet_banking_scb',
        amount: 999999999,
        currency: 'THB',
        bank: 'scb'
      });

      expect(result.success).toBe(true);
    });

    it('should handle minimum amounts', async () => {
      const mockSource = createMockSource();
      mockOmiseClient.post.mockResolvedValue(mockSource);

      const result = await sourceTools.createSource({
        type: 'internet_banking_scb',
        amount: 1,
        currency: 'THB',
        bank: 'scb'
      });

      expect(result.success).toBe(true);
    });
  });
});
