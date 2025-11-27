/**
 * Transfer Tools Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TransferTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import type { OmiseTransfer, OmiseListResponse } from '../../src/types';
import { createMockTransfer } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client.js');
jest.mock('../../src/utils/logger.js');

describe('TransferTools', () => {
  let transferTools: TransferTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({
      baseUrl: 'https://api.omise.co',
      secretKey: 'skey_test_123'
    } as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    transferTools = new TransferTools(mockOmiseClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTools', () => {
    it('should return all transfer-related tools', () => {
      const tools = transferTools.getTools();
      
      expect(tools).toHaveLength(5);
      expect(tools.map(t => t.name)).toEqual([
        'create_transfer',
        'retrieve_transfer',
        'list_transfers',
        'update_transfer',
        'destroy_transfer'
      ]);
    });

    it('should have correct tool schemas', () => {
      const tools = transferTools.getTools();
      
      // Check create_transfer schema
      const createTransferTool = tools.find(t => t.name === 'create_transfer');
      expect(createTransferTool?.inputSchema.required).toEqual(['amount', 'currency', 'recipient']);
      expect(createTransferTool?.inputSchema.properties).toHaveProperty('amount');
      expect(createTransferTool?.inputSchema.properties).toHaveProperty('currency');
      expect(createTransferTool?.inputSchema.properties).toHaveProperty('recipient');
      expect(createTransferTool?.inputSchema.properties).toHaveProperty('description');
      expect(createTransferTool?.inputSchema.properties).toHaveProperty('scheduled_date');
      expect(createTransferTool?.inputSchema.properties).toHaveProperty('metadata');
      
      // Check retrieve_transfer schema
      const retrieveTransferTool = tools.find(t => t.name === 'retrieve_transfer');
      expect(retrieveTransferTool?.inputSchema.required).toEqual(['transfer_id']);
      
      // Check list_transfers schema
      const listTransfersTool = tools.find(t => t.name === 'list_transfers');
      expect(listTransfersTool?.inputSchema.properties).toHaveProperty('limit');
      expect(listTransfersTool?.inputSchema.properties).toHaveProperty('offset');
      expect(listTransfersTool?.inputSchema.properties).toHaveProperty('order');
      expect(listTransfersTool?.inputSchema.properties).toHaveProperty('from');
      expect(listTransfersTool?.inputSchema.properties).toHaveProperty('to');
      expect(listTransfersTool?.inputSchema.properties).toHaveProperty('recipient');
      
      // Check update_transfer schema
      const updateTransferTool = tools.find(t => t.name === 'update_transfer');
      expect(updateTransferTool?.inputSchema.required).toEqual(['transfer_id']);
      expect(updateTransferTool?.inputSchema.properties).toHaveProperty('amount');
      expect(updateTransferTool?.inputSchema.properties).toHaveProperty('description');
      expect(updateTransferTool?.inputSchema.properties).toHaveProperty('scheduled_date');
      expect(updateTransferTool?.inputSchema.properties).toHaveProperty('metadata');
      
      // Check destroy_transfer schema
      const destroyTransferTool = tools.find(t => t.name === 'destroy_transfer');
      expect(destroyTransferTool?.inputSchema.required).toEqual(['transfer_id']);
      expect(destroyTransferTool?.inputSchema.properties).toHaveProperty('confirm');
    });

    it('should have correct currency pattern validation', () => {
      const tools = transferTools.getTools();
      const createTransferTool = tools.find(t => t.name === 'create_transfer');
      const currencyPattern = createTransferTool?.inputSchema.properties?.currency?.pattern;
      
      expect(currencyPattern).toBe('^[A-Z]{3}$');
    });

    it('should have correct order enum values', () => {
      const tools = transferTools.getTools();
      const listTransfersTool = tools.find(t => t.name === 'list_transfers');
      const orderEnum = listTransfersTool?.inputSchema.properties?.order?.enum;
      
      expect(orderEnum).toContain('chronological');
      expect(orderEnum).toContain('reverse_chronological');
    });

    it('should have correct amount validation', () => {
      const tools = transferTools.getTools();
      const createTransferTool = tools.find(t => t.name === 'create_transfer');
      const amountMin = createTransferTool?.inputSchema.properties?.amount?.minimum;
      
      expect(amountMin).toBe(1);
    });

    it('should have correct limit validation', () => {
      const tools = transferTools.getTools();
      const listTransfersTool = tools.find(t => t.name === 'list_transfers');
      const limitProps = listTransfersTool?.inputSchema.properties?.limit;
      
      expect(limitProps?.minimum).toBe(1);
      expect(limitProps?.maximum).toBe(100);
      expect(limitProps?.default).toBe(20);
    });
  });

  describe('createTransfer', () => {
    const validParams = {
      amount: 1000,
      currency: 'THB',
      recipient: 'recp_1234567890abcdefgha'
    };

    it('should create transfer successfully with minimal required fields', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      const result = await transferTools.createTransfer(validParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransfer);
      expect(result.message).toContain('Transfer created successfully');
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/transfers', {
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha',
        description: undefined,
        scheduled_date: undefined,
        metadata: undefined
      });
    });

    it('should create transfer successfully with all optional fields', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      // Use a future date that's definitely valid
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      const params = {
        ...validParams,
        description: 'Test transfer',
        scheduled_date: futureDate,
        metadata: { order_id: '12345', customer_id: 'cust_001' }
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransfer);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/transfers', {
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha',
        description: 'Test transfer',
        scheduled_date: futureDate,
        metadata: { order_id: '12345', customer_id: 'cust_001' }
      });
    });

    it('should handle currency case insensitivity', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      const params = {
        ...validParams,
        currency: 'usd'
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/transfers', expect.objectContaining({
        currency: 'USD'
      }));
    });

    it('should fail with invalid currency', async () => {
      const params = {
        ...validParams,
        currency: 'INVALID'
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid currency code');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail with invalid amount (zero)', async () => {
      const params = {
        ...validParams,
        amount: 0
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail with invalid amount (negative)', async () => {
      const params = {
        ...validParams,
        amount: -100
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail with invalid recipient ID format', async () => {
      const params = {
        ...validParams,
        recipient: 'invalid_recipient_id'
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid recipient ID format');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail with past scheduled date', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      const params = {
        ...validParams,
        scheduled_date: pastDate
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid scheduled date');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should fail with scheduled date more than one year in future', async () => {
      const futureDate = new Date(Date.now() + 366 * 86400000).toISOString(); // More than 1 year
      const params = {
        ...validParams,
        scheduled_date: futureDate
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid scheduled date');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should sanitize metadata correctly', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      const params = {
        ...validParams,
        metadata: {
          valid_string: 'test',
          valid_number: 123,
          valid_boolean: true,
          invalid_object: { nested: 'value' },
          invalid_array: ['item1', 'item2'],
          null_value: null
        }
      };

      const result = await transferTools.createTransfer(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/transfers', expect.objectContaining({
        metadata: {
          valid_string: 'test',
          valid_number: 123,
          valid_boolean: true,
          null_value: null
        }
      }));
    });

    it('should handle API errors', async () => {
      mockOmiseClient.post.mockRejectedValue(new Error('API Error'));

      const result = await transferTools.createTransfer(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle unknown errors', async () => {
      mockOmiseClient.post.mockRejectedValue('Unknown error');

      const result = await transferTools.createTransfer(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should handle non-Error objects thrown', async () => {
      mockOmiseClient.post.mockRejectedValue({ message: 'Not an Error object' });

      const result = await transferTools.createTransfer(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should log transfer creation attempt', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      await transferTools.createTransfer(validParams);

      expect(mockLogger.info).toHaveBeenCalledWith('Creating transfer via MCP tool', {
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha'
      });
    });

    it('should log errors', async () => {
      const error = new Error('API Error');
      mockOmiseClient.post.mockRejectedValue(error);

      await transferTools.createTransfer(validParams);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create transfer via MCP tool', error, validParams);
    });
  });

  describe('retrieveTransfer', () => {
    const validParams = {
      transfer_id: 'trsf_1234567890abcdefgha'
    };

    it('should retrieve transfer successfully', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.get.mockResolvedValue(mockTransfer);

      const result = await transferTools.retrieveTransfer(validParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransfer);
      expect(result.message).toContain('Transfer retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/transfers/trsf_1234567890abcdefgha');
    });

    it('should fail with invalid transfer ID format', async () => {
      const params = {
        transfer_id: 'invalid_transfer_id'
      };

      const result = await transferTools.retrieveTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transfer ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should handle test mode transfer ID', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.get.mockResolvedValue(mockTransfer);

      const params = {
        transfer_id: 'trsf_test_1234567890abcdefgha'
      };

      const result = await transferTools.retrieveTransfer(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/transfers/trsf_test_1234567890abcdefgha');
    });

    it('should handle API errors', async () => {
      mockOmiseClient.get.mockRejectedValue(new Error('Transfer not found'));

      const result = await transferTools.retrieveTransfer(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transfer not found');
    });

    it('should log retrieval attempt', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.get.mockResolvedValue(mockTransfer);

      await transferTools.retrieveTransfer(validParams);

      expect(mockLogger.info).toHaveBeenCalledWith('Retrieving transfer via MCP tool', {
        transferId: 'trsf_1234567890abcdefgha'
      });
    });

    it('should log errors', async () => {
      const error = new Error('Transfer not found');
      mockOmiseClient.get.mockRejectedValue(error);

      await transferTools.retrieveTransfer(validParams);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to retrieve transfer via MCP tool', error, {
        transferId: 'trsf_1234567890abcdefgha'
      });
    });

    it('should handle non-Error objects in retrieveTransfer', async () => {
      mockOmiseClient.get.mockRejectedValue({ message: 'Not an Error object' });

      const result = await transferTools.retrieveTransfer(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('listTransfers', () => {
    it('should list transfers successfully with default parameters', async () => {
      const mockTransfers: OmiseListResponse<OmiseTransfer> = {
        object: 'list',
        data: [createMockTransfer(), createMockTransfer()],
        total: 2,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/transfers'
      };
      mockOmiseClient.get.mockResolvedValue(mockTransfers);

      const result = await transferTools.listTransfers({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransfers);
      expect(result.message).toContain('Retrieved 2 transfers (total: 2)');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/transfers', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should list transfers with custom parameters', async () => {
      const mockTransfers: OmiseListResponse<OmiseTransfer> = {
        object: 'list',
        data: [createMockTransfer()],
        total: 1,
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        location: '/transfers'
      };
      mockOmiseClient.get.mockResolvedValue(mockTransfers);

      const params = {
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        recipient: 'recp_1234567890abcdefgha'
      };

      const result = await transferTools.listTransfers(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/transfers', {
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        recipient: 'recp_1234567890abcdefgha'
      });
    });

    it('should enforce maximum limit of 100', async () => {
      const mockTransfers: OmiseListResponse<OmiseTransfer> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        order: 'chronological',
        location: '/transfers'
      };
      mockOmiseClient.get.mockResolvedValue(mockTransfers);

      const params = {
        limit: 150 // Should be capped at 100
      };

      const result = await transferTools.listTransfers(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/transfers', expect.objectContaining({
        limit: 100
      }));
    });

    it('should enforce minimum offset of 0', async () => {
      const mockTransfers: OmiseListResponse<OmiseTransfer> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/transfers'
      };
      mockOmiseClient.get.mockResolvedValue(mockTransfers);

      const params = {
        offset: -5 // Should be set to 0
      };

      const result = await transferTools.listTransfers(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/transfers', expect.objectContaining({
        offset: 0
      }));
    });

    it('should handle API errors', async () => {
      mockOmiseClient.get.mockRejectedValue(new Error('API Error'));

      const result = await transferTools.listTransfers({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should log listing attempt', async () => {
      const mockTransfers: OmiseListResponse<OmiseTransfer> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/transfers'
      };
      mockOmiseClient.get.mockResolvedValue(mockTransfers);

      const params = { limit: 10 };
      await transferTools.listTransfers(params);

      expect(mockLogger.info).toHaveBeenCalledWith('Listing transfers via MCP tool', params);
    });

    it('should log errors', async () => {
      const error = new Error('API Error');
      mockOmiseClient.get.mockRejectedValue(error);

      const params = { limit: 10 };
      await transferTools.listTransfers(params);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to list transfers via MCP tool', error, params);
    });

    it('should handle non-Error objects in listTransfers', async () => {
      mockOmiseClient.get.mockRejectedValue({ message: 'Not an Error object' });

      const result = await transferTools.listTransfers({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('updateTransfer', () => {
    const validParams = {
      transfer_id: 'trsf_1234567890abcdefgha',
      amount: 2000,
      description: 'Updated transfer',
      scheduled_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      metadata: { updated: true }
    };

    it('should update transfer successfully with all fields', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.put.mockResolvedValue(mockTransfer);

      const result = await transferTools.updateTransfer(validParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransfer);
      expect(result.message).toContain('Transfer updated successfully');
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/transfers/trsf_1234567890abcdefgha', {
        amount: 2000,
        description: 'Updated transfer',
        scheduled_date: validParams.scheduled_date,
        metadata: { updated: true }
      });
    });

    it('should update transfer with partial fields', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.put.mockResolvedValue(mockTransfer);

      const params = {
        transfer_id: 'trsf_1234567890abcdefgha',
        description: 'Updated description only'
      };

      const result = await transferTools.updateTransfer(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/transfers/trsf_1234567890abcdefgha', {
        description: 'Updated description only'
      });
    });

    it('should fail with invalid transfer ID format', async () => {
      const params = {
        transfer_id: 'invalid_transfer_id',
        description: 'Updated description'
      };

      const result = await transferTools.updateTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transfer ID format');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid amount (zero)', async () => {
      const params = {
        transfer_id: 'trsf_1234567890abcdefgha',
        amount: 0
      };

      const result = await transferTools.updateTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transfer amount must be positive');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid amount (negative)', async () => {
      const params = {
        transfer_id: 'trsf_1234567890abcdefgha',
        amount: -100
      };

      const result = await transferTools.updateTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transfer amount must be positive');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid scheduled date', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const params = {
        transfer_id: 'trsf_1234567890abcdefgha',
        scheduled_date: pastDate
      };

      const result = await transferTools.updateTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid scheduled date');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail when no update data provided', async () => {
      const params = {
        transfer_id: 'trsf_1234567890abcdefgha'
      };

      const result = await transferTools.updateTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No update data provided');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockOmiseClient.put.mockRejectedValue(new Error('Transfer not found'));

      const params = {
        transfer_id: 'trsf_1234567890abcdefgha',
        description: 'Updated description'
      };

      const result = await transferTools.updateTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transfer not found');
    });

    it('should log update attempt', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.put.mockResolvedValue(mockTransfer);

      await transferTools.updateTransfer(validParams);

      expect(mockLogger.info).toHaveBeenCalledWith('Updating transfer via MCP tool', {
        transferId: 'trsf_1234567890abcdefgha'
      });
    });

    it('should log errors', async () => {
      const error = new Error('Transfer not found');
      mockOmiseClient.put.mockRejectedValue(error);

      const params = {
        transfer_id: 'trsf_1234567890abcdefgha',
        description: 'Updated description'
      };

      await transferTools.updateTransfer(params);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update transfer via MCP tool', error, {
        transferId: 'trsf_1234567890abcdefgha'
      });
    });

    it('should handle non-Error objects in updateTransfer', async () => {
      mockOmiseClient.put.mockRejectedValue({ message: 'Not an Error object' });

      const params = {
        transfer_id: 'trsf_1234567890abcdefgha',
        description: 'Updated description'
      };

      const result = await transferTools.updateTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('destroyTransfer', () => {
    const validParams = {
      transfer_id: 'trsf_1234567890abcdefgha',
      confirm: true
    };

    it('should destroy transfer successfully with confirmation', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.delete.mockResolvedValue(mockTransfer);

      const result = await transferTools.destroyTransfer(validParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransfer);
      expect(result.message).toContain('Transfer deleted successfully');
      expect(mockOmiseClient.delete).toHaveBeenCalledWith('/transfers/trsf_1234567890abcdefgha');
    });

    it('should fail with invalid transfer ID format', async () => {
      const params = {
        transfer_id: 'invalid_transfer_id',
        confirm: true
      };

      const result = await transferTools.destroyTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transfer ID format');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should fail without confirmation', async () => {
      const params = {
        transfer_id: 'trsf_1234567890abcdefgha',
        confirm: false
      };

      const result = await transferTools.destroyTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transfer deletion requires confirmation');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should fail when confirm is undefined', async () => {
      const params = {
        transfer_id: 'trsf_1234567890abcdefgha'
      };

      const result = await transferTools.destroyTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transfer deletion requires confirmation');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockOmiseClient.delete.mockRejectedValue(new Error('Transfer not found'));

      const result = await transferTools.destroyTransfer(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transfer not found');
    });

    it('should log destruction attempt', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.delete.mockResolvedValue(mockTransfer);

      await transferTools.destroyTransfer(validParams);

      expect(mockLogger.info).toHaveBeenCalledWith('Destroying transfer via MCP tool', {
        transferId: 'trsf_1234567890abcdefgha'
      });
    });

    it('should log errors', async () => {
      const error = new Error('Transfer not found');
      mockOmiseClient.delete.mockRejectedValue(error);

      await transferTools.destroyTransfer(validParams);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to destroy transfer via MCP tool', error, {
        transferId: 'trsf_1234567890abcdefgha'
      });
    });

    it('should handle non-Error objects in destroyTransfer', async () => {
      mockOmiseClient.delete.mockRejectedValue({ message: 'Not an Error object' });

      const result = await transferTools.destroyTransfer(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Validation Methods', () => {
    describe('validateTransferId', () => {
      it('should validate correct transfer ID format', () => {
        const validIds = [
          'trsf_1234567890abcdefgha',
          'trsf_test_1234567890abcdefgha'
        ];

        validIds.forEach(id => {
          // Access private method through any casting
          const isValid = (transferTools as any).validateTransferId(id);
          expect(isValid).toBe(true);
        });
      });

      it('should reject invalid transfer ID format', () => {
        const invalidIds = [
          'invalid_id',
          'trsf_',
          'trsf_123',
          'TRSF_1234567890abcdefgha', // uppercase
          'trsf_1234567890ABCDEFGHA', // uppercase chars
          'trsf_1234567890abcdefgha_extra' // too long
        ];

        invalidIds.forEach(id => {
          const isValid = (transferTools as any).validateTransferId(id);
          expect(isValid).toBe(false);
        });
      });
    });

    describe('validateRecipientId', () => {
      it('should validate correct recipient ID format', () => {
        const validIds = [
          'recp_1234567890abcdefgha',
          'recp_test_1234567890abcdefgha'
        ];

        validIds.forEach(id => {
          const isValid = (transferTools as any).validateRecipientId(id);
          expect(isValid).toBe(true);
        });
      });

      it('should reject invalid recipient ID format', () => {
        const invalidIds = [
          'invalid_id',
          'recp_',
          'recp_123',
          'RECP_1234567890abcdefgha', // uppercase
          'recp_1234567890ABCDEFGHA', // uppercase chars
          'recp_1234567890abcdefgha_extra' // too long
        ];

        invalidIds.forEach(id => {
          const isValid = (transferTools as any).validateRecipientId(id);
          expect(isValid).toBe(false);
        });
      });
    });

    describe('validateCurrency', () => {
      it('should validate supported currencies', () => {
        const validCurrencies = ['THB', 'USD', 'JPY', 'EUR', 'GBP', 'SGD', 'HKD', 'AUD', 'CAD', 'CHF', 'CNY'];

        validCurrencies.forEach(currency => {
          const isValid = (transferTools as any).validateCurrency(currency);
          expect(isValid).toBe(true);
        });
      });

      it('should handle case insensitive currency validation', () => {
        const currencies = ['thb', 'usd', 'jpy', 'eur', 'gbp'];

        currencies.forEach(currency => {
          const isValid = (transferTools as any).validateCurrency(currency);
          expect(isValid).toBe(true);
        });
      });

      it('should reject unsupported currencies', () => {
        const invalidCurrencies = ['INVALID', 'BTC', 'ETH', 'XYZ', ''];

        invalidCurrencies.forEach(currency => {
          const isValid = (transferTools as any).validateCurrency(currency);
          expect(isValid).toBe(false);
        });
      });
    });

    describe('validateAmount', () => {
      it('should validate positive amounts', () => {
        const validAmounts = [1, 100, 1000, 1000000];

        validAmounts.forEach(amount => {
          const isValid = (transferTools as any).validateAmount(amount, 'THB');
          expect(isValid).toBe(true);
        });
      });

      it('should reject zero or negative amounts', () => {
        const invalidAmounts = [0, -1, -100];

        invalidAmounts.forEach(amount => {
          const isValid = (transferTools as any).validateAmount(amount, 'THB');
          expect(isValid).toBe(false);
        });
      });

      it('should validate minimum amounts by currency', () => {
        const currencyMinAmounts = [
          { currency: 'THB', amount: 1 },
          { currency: 'USD', amount: 1 },
          { currency: 'JPY', amount: 1 },
          { currency: 'EUR', amount: 1 },
          { currency: 'GBP', amount: 1 }
        ];

        currencyMinAmounts.forEach(({ currency, amount }) => {
          const isValid = (transferTools as any).validateAmount(amount, currency);
          expect(isValid).toBe(true);
        });
      });
    });

    describe('validateScheduledDate', () => {
      it('should validate future dates within one year', () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
        const isValid = (transferTools as any).validateScheduledDate(futureDate);
        expect(isValid).toBe(true);
      });

      it('should reject past dates', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
        const isValid = (transferTools as any).validateScheduledDate(pastDate);
        expect(isValid).toBe(false);
      });

      it('should reject dates more than one year in future', () => {
        const farFutureDate = new Date(Date.now() + 366 * 86400000).toISOString(); // More than 1 year
        const isValid = (transferTools as any).validateScheduledDate(farFutureDate);
        expect(isValid).toBe(false);
      });

      it('should reject current date', () => {
        const currentDate = new Date().toISOString();
        const isValid = (transferTools as any).validateScheduledDate(currentDate);
        expect(isValid).toBe(false);
      });
    });

    describe('sanitizeMetadata', () => {
      it('should sanitize valid metadata types', () => {
        const metadata = {
          string_value: 'test',
          number_value: 123,
          boolean_value: true,
          null_value: null
        };

        const sanitized = (transferTools as any).sanitizeMetadata(metadata);
        expect(sanitized).toEqual(metadata);
      });

      it('should filter out invalid metadata types', () => {
        const metadata = {
          valid_string: 'test',
          invalid_object: { nested: 'value' },
          invalid_array: ['item1', 'item2'],
          valid_number: 123
        };

        const sanitized = (transferTools as any).sanitizeMetadata(metadata);
        expect(sanitized).toEqual({
          valid_string: 'test',
          valid_number: 123
        });
      });

      it('should return undefined for empty metadata', () => {
        const metadata = {};
        const sanitized = (transferTools as any).sanitizeMetadata(metadata);
        expect(sanitized).toBeUndefined();
      });

      it('should return undefined for non-object metadata', () => {
        const invalidMetadata = ['array', 'string', 123, true, null];
        
        invalidMetadata.forEach(metadata => {
          const sanitized = (transferTools as any).sanitizeMetadata(metadata);
          expect(sanitized).toBeUndefined();
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      mockOmiseClient.post.mockRejectedValue(timeoutError);

      const result = await transferTools.createTransfer({
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockOmiseClient.get.mockRejectedValue(rateLimitError);

      const result = await transferTools.listTransfers({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      mockOmiseClient.put.mockRejectedValue(authError);

      const result = await transferTools.updateTransfer({
        transfer_id: 'trsf_1234567890abcdefgha',
        description: 'Updated'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Internal server error');
      mockOmiseClient.delete.mockRejectedValue(serverError);

      const result = await transferTools.destroyTransfer({
        transfer_id: 'trsf_1234567890abcdefgha',
        confirm: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });

    it('should handle malformed API responses', async () => {
      mockOmiseClient.post.mockResolvedValue(null);

      const result = await transferTools.createTransfer({
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      const result = await transferTools.createTransfer({
        amount: 999999999,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha'
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/transfers', expect.objectContaining({
        amount: 999999999
      }));
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(255);
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      const result = await transferTools.createTransfer({
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha',
        description: longDescription
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/transfers', expect.objectContaining({
        description: longDescription
      }));
    });

    it('should handle empty metadata object', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      const result = await transferTools.createTransfer({
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha',
        metadata: {}
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/transfers', expect.objectContaining({
        metadata: undefined
      }));
    });

    it('should handle undefined optional parameters', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.post.mockResolvedValue(mockTransfer);

      const result = await transferTools.createTransfer({
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha',
        description: undefined,
        scheduled_date: undefined,
        metadata: undefined
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/transfers', {
        amount: 1000,
        currency: 'THB',
        recipient: 'recp_1234567890abcdefgha',
        description: undefined,
        scheduled_date: undefined,
        metadata: undefined
      });
    });

    it('should handle concurrent operations', async () => {
      const mockTransfer = createMockTransfer();
      mockOmiseClient.get.mockResolvedValue(mockTransfer);

      const promises = Array.from({ length: 5 }, () =>
        transferTools.retrieveTransfer({
          transfer_id: 'trsf_1234567890abcdefgha'
        })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockTransfer);
      });

      expect(mockOmiseClient.get).toHaveBeenCalledTimes(5);
    });
  });
});
