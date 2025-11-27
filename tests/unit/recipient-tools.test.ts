/**
 * Recipient Tools Unit Tests
 */

import { RecipientTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import type { OmiseRecipient, OmiseListResponse } from '../../src/types';
import { createMockRecipient } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client.js');
jest.mock('../../src/utils/logger.js');

describe('RecipientTools', () => {
  let recipientTools: RecipientTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({
      baseUrl: 'https://api.omise.co',
      secretKey: 'skey_test_123',
    } as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    recipientTools = new RecipientTools(mockOmiseClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTools', () => {
    it('should return all recipient-related tools', () => {
      const tools = recipientTools.getTools();
      
      expect(tools).toHaveLength(6);
      expect(tools.map(t => t.name)).toEqual([
        'create_recipient',
        'retrieve_recipient',
        'list_recipients',
        'update_recipient',
        'destroy_recipient',
        'verify_recipient'
      ]);
    });

    it('should have correct tool schemas', () => {
      const tools = recipientTools.getTools();
      
      // Check create_recipient schema
      const createRecipientTool = tools.find(t => t.name === 'create_recipient');
      expect(createRecipientTool?.inputSchema.required).toEqual(['name', 'bank_account']);
      expect(createRecipientTool?.inputSchema.properties).toHaveProperty('name');
      expect(createRecipientTool?.inputSchema.properties).toHaveProperty('email');
      expect(createRecipientTool?.inputSchema.properties).toHaveProperty('bank_account');
      
      // Check retrieve_recipient schema
      const retrieveRecipientTool = tools.find(t => t.name === 'retrieve_recipient');
      expect(retrieveRecipientTool?.inputSchema.required).toEqual(['recipient_id']);
      
      // Check destroy_recipient schema
      const destroyRecipientTool = tools.find(t => t.name === 'destroy_recipient');
      expect(destroyRecipientTool?.inputSchema.required).toEqual(['recipient_id']);
      expect(destroyRecipientTool?.inputSchema.properties).toHaveProperty('confirm');
    });

    it('should have correct bank brand enum values', () => {
      const tools = recipientTools.getTools();
      const createRecipientTool = tools.find(t => t.name === 'create_recipient');
      const bankBrandEnum = createRecipientTool?.inputSchema.properties?.bank_account?.properties?.brand?.enum;
      
      expect(bankBrandEnum).toContain('bbl');
      expect(bankBrandEnum).toContain('ktb');
      expect(bankBrandEnum).toContain('scb');
      expect(bankBrandEnum).toContain('bay');
      expect(bankBrandEnum).toContain('tmb');
    });
  });

  describe('createRecipient', () => {
    const validBankAccount = {
      brand: 'bbl',
      number: '1234567890',
      name: 'John Doe'
    };

    it('should create recipient successfully with minimal required fields', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.post.mockResolvedValue(mockRecipient);

      const params = {
        name: 'John Doe',
        bank_account: validBankAccount
      };

      const result = await recipientTools.createRecipient(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecipient);
      expect(result.message).toBe(`Recipient created successfully with ID: ${mockRecipient.id}`);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/recipients', {
        name: 'John Doe',
        email: undefined,
        description: undefined,
        type: 'individual',
        tax_id: undefined,
        bank_account: validBankAccount,
        metadata: undefined
      });
    });

    it('should create recipient with all fields', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.post.mockResolvedValue(mockRecipient);

      const params = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        description: 'Test recipient',
        type: 'corporation',
        tax_id: '1234567890123',
        bank_account: validBankAccount,
        metadata: { department: 'finance' }
      };

      const result = await recipientTools.createRecipient(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/recipients', {
        name: 'Jane Smith',
        email: 'jane@example.com',
        description: 'Test recipient',
        type: 'corporation',
        tax_id: '1234567890123',
        bank_account: validBankAccount,
        metadata: { department: 'finance' }
      });
    });

    it('should validate email format', async () => {
      const result = await recipientTools.createRecipient({
        name: 'John Doe',
        email: 'invalid-email',
        bank_account: validBankAccount
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should validate tax ID format', async () => {
      const result = await recipientTools.createRecipient({
        name: 'John Doe',
        tax_id: '12345', // Too short
        bank_account: validBankAccount
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid tax ID format. Must be 13 digits.');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should validate bank account - missing bank account', async () => {
      const result = await recipientTools.createRecipient({
        name: 'John Doe'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bank account information is required');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should validate bank account - invalid brand', async () => {
      const result = await recipientTools.createRecipient({
        name: 'John Doe',
        bank_account: {
          brand: 'invalid_bank',
          number: '1234567890',
          name: 'John Doe'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid bank brand code');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should validate bank account - invalid account number', async () => {
      const result = await recipientTools.createRecipient({
        name: 'John Doe',
        bank_account: {
          brand: 'bbl',
          number: '123', // Too short
          name: 'John Doe'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid bank account number format');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should validate bank account - invalid account holder name', async () => {
      const result = await recipientTools.createRecipient({
        name: 'John Doe',
        bank_account: {
          brand: 'bbl',
          number: '1234567890',
          name: '' // Empty name
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid account holder name');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should sanitize metadata', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.post.mockResolvedValue(mockRecipient);

      const params = {
        name: 'John Doe',
        bank_account: validBankAccount,
        metadata: {
          valid: 'string',
          number: 123,
          boolean: true,
          null: null,
          invalid: { object: 'should be filtered' }
        }
      };

      await recipientTools.createRecipient(params);

      expect(mockOmiseClient.post).toHaveBeenCalledWith('/recipients', expect.objectContaining({
        metadata: {
          valid: 'string',
          number: 123,
          boolean: true,
          null: null
        }
      }));
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockOmiseClient.post.mockRejectedValue(error);

      const result = await recipientTools.createRecipient({
        name: 'John Doe',
        bank_account: validBankAccount
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.post.mockRejectedValue('String error');

      const result = await recipientTools.createRecipient({
        name: 'John Doe',
        bank_account: validBankAccount
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('retrieveRecipient', () => {
    it('should retrieve recipient successfully with valid ID', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.get.mockResolvedValue(mockRecipient);

      const result = await recipientTools.retrieveRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecipient);
      expect(result.message).toBe('Recipient retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/recipients/recp_test_1234567890abcdefghi');
    });

    it('should validate recipient ID format', async () => {
      const result = await recipientTools.retrieveRecipient({
        recipient_id: 'invalid_id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipient ID format. Must be in format: recp_xxxxxxxxxxxxxxxx (19 chars)');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = new Error('Recipient not found');
      mockOmiseClient.get.mockRejectedValue(error);

      const result = await recipientTools.retrieveRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipient not found');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.get.mockRejectedValue({ code: 'error_code' });

      const result = await recipientTools.retrieveRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('listRecipients', () => {
    it('should list recipients successfully with default parameters', async () => {
      const mockRecipients: OmiseListResponse<OmiseRecipient> = {
        object: 'list',
        data: [createMockRecipient()],
        total: 1,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/recipients'
      };

      mockOmiseClient.get.mockResolvedValue(mockRecipients);

      const result = await recipientTools.listRecipients({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecipients);
      expect(result.message).toBe('Retrieved 1 recipients (total: 1)');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/recipients', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should list recipients with custom parameters', async () => {
      const mockRecipients: OmiseListResponse<OmiseRecipient> = {
        object: 'list',
        data: [createMockRecipient()],
        total: 1,
        limit: 10,
        offset: 5,
        order: 'reverse_chronological' as const,
        location: '/recipients'
      };

      mockOmiseClient.get.mockResolvedValue(mockRecipients);

      const params = {
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        type: 'individual',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      };

      const result = await recipientTools.listRecipients(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/recipients', {
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        type: 'individual',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      });
    });

    it('should enforce limit and offset constraints', async () => {
      const mockRecipients: OmiseListResponse<OmiseRecipient> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        order: 'chronological' as const,
        location: '/recipients'
      };

      mockOmiseClient.get.mockResolvedValue(mockRecipients);

      const params = {
        limit: 150, // Should be capped at 100
        offset: -5   // Should be set to 0
      };

      await recipientTools.listRecipients(params);

      expect(mockOmiseClient.get).toHaveBeenCalledWith('/recipients', {
        limit: 100,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockOmiseClient.get.mockRejectedValue(error);

      const result = await recipientTools.listRecipients({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.get.mockRejectedValue(null);

      const result = await recipientTools.listRecipients({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('updateRecipient', () => {
    it('should update recipient successfully', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.put.mockResolvedValue(mockRecipient);

      const params = {
        recipient_id: 'recp_test_1234567890abcdefghi',
        name: 'Updated Name',
        email: 'updated@example.com',
        description: 'Updated description'
      };

      const result = await recipientTools.updateRecipient(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecipient);
      expect(result.message).toBe('Recipient updated successfully');
      expect(mockOmiseClient.put).toHaveBeenCalledWith(
        '/recipients/recp_test_1234567890abcdefghi',
        {
          name: 'Updated Name',
          email: 'updated@example.com',
          description: 'Updated description',
          tax_id: undefined,
          bank_account: undefined,
          metadata: undefined
        }
      );
    });

    it('should require at least one update field', async () => {
      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No update data provided. Please provide name, email, description, tax_id, bank_account, or metadata to update.');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should validate recipient ID format', async () => {
      const result = await recipientTools.updateRecipient({
        recipient_id: 'invalid_id',
        name: 'Updated Name'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipient ID format. Must be in format: recp_xxxxxxxxxxxxxxxx (19 chars)');
    });

    it('should validate email format in update', async () => {
      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        email: 'invalid-email'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should validate tax ID format in update', async () => {
      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        tax_id: '12345'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid tax ID format. Must be 13 digits.');
    });

    it('should validate bank account in update', async () => {
      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        bank_account: {
          brand: 'invalid_bank',
          number: '1234567890',
          name: 'John Doe'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid bank brand code');
    });

    it('should update recipient with tax_id only', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.put.mockResolvedValue(mockRecipient);

      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        tax_id: '1234567890123'
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith(
        '/recipients/recp_test_1234567890abcdefghi',
        {
          tax_id: '1234567890123'
        }
      );
    });

    it('should update recipient with bank_account only', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.put.mockResolvedValue(mockRecipient);

      const validBankAccount = {
        brand: 'ktb',
        number: '9876543210',
        name: 'Jane Doe'
      };

      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        bank_account: validBankAccount
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith(
        '/recipients/recp_test_1234567890abcdefghi',
        {
          bank_account: validBankAccount
        }
      );
    });

    it('should update recipient with metadata only', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.put.mockResolvedValue(mockRecipient);

      const metadata = {
        department: 'finance',
        category: 'vendor'
      };

      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        metadata: metadata
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith(
        '/recipients/recp_test_1234567890abcdefghi',
        {
          metadata: metadata
        }
      );
    });

    it('should update recipient with all fields including tax_id, bank_account, and metadata', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.put.mockResolvedValue(mockRecipient);

      const validBankAccount = {
        brand: 'scb',
        number: '5555555555',
        name: 'Account Holder'
      };

      const metadata = {
        department: 'operations',
        priority: 'high'
      };

      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        name: 'Updated Name',
        email: 'updated@example.com',
        description: 'Updated description',
        tax_id: '9876543210987',
        bank_account: validBankAccount,
        metadata: metadata
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith(
        '/recipients/recp_test_1234567890abcdefghi',
        {
          name: 'Updated Name',
          email: 'updated@example.com',
          description: 'Updated description',
          tax_id: '9876543210987',
          bank_account: validBankAccount,
          metadata: metadata
        }
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('Update failed');
      mockOmiseClient.put.mockRejectedValue(error);

      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        name: 'Updated Name'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.put.mockRejectedValue('String error');

      const result = await recipientTools.updateRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        name: 'Updated Name'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('destroyRecipient', () => {
    it('should destroy recipient successfully with confirmation', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.delete.mockResolvedValue(mockRecipient);

      const result = await recipientTools.destroyRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        confirm: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecipient);
      expect(result.message).toBe('Recipient deleted successfully');
      expect(mockOmiseClient.delete).toHaveBeenCalledWith('/recipients/recp_test_1234567890abcdefghi');
    });

    it('should require confirmation for deletion', async () => {
      const result = await recipientTools.destroyRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        confirm: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipient deletion requires confirmation. Set confirm=true to proceed.');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should validate recipient ID format', async () => {
      const result = await recipientTools.destroyRecipient({
        recipient_id: 'invalid_id',
        confirm: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipient ID format. Must be in format: recp_xxxxxxxxxxxxxxxx (19 chars)');
    });

    it('should handle API errors', async () => {
      const error = new Error('Delete failed');
      mockOmiseClient.delete.mockRejectedValue(error);

      const result = await recipientTools.destroyRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        confirm: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.delete.mockRejectedValue(123);

      const result = await recipientTools.destroyRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        confirm: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('verifyRecipient', () => {
    it('should verify recipient successfully with automatic method', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.post.mockResolvedValue(mockRecipient);

      const result = await recipientTools.verifyRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecipient);
      expect(result.message).toBe('Recipient verification initiated successfully');
      expect(mockOmiseClient.post).toHaveBeenCalledWith(
        '/recipients/recp_test_1234567890abcdefghi/verify',
        { verification_method: 'automatic' }
      );
    });

    it('should verify recipient with manual method', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.post.mockResolvedValue(mockRecipient);

      const result = await recipientTools.verifyRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi',
        verification_method: 'manual'
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith(
        '/recipients/recp_test_1234567890abcdefghi/verify',
        { verification_method: 'manual' }
      );
    });

    it('should validate recipient ID format', async () => {
      const result = await recipientTools.verifyRecipient({
        recipient_id: 'invalid_id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipient ID format. Must be in format: recp_xxxxxxxxxxxxxxxx (19 chars)');
    });

    it('should handle API errors', async () => {
      const error = new Error('Verification failed');
      mockOmiseClient.post.mockRejectedValue(error);

      const result = await recipientTools.verifyRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Verification failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.post.mockRejectedValue(false);

      const result = await recipientTools.verifyRecipient({
        recipient_id: 'recp_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Validation Functions', () => {
    describe('validateRecipientId', () => {
      it('should validate correct recipient ID formats', () => {
        const validIds = [
          'recp_test_1234567890abcdefghi',
          'recp_1234567890abcdefghi'
        ];

        validIds.forEach(id => {
          const result = (recipientTools as any).validateRecipientId(id);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid recipient ID formats', () => {
        const invalidIds = [
          'recp_invalid',
          'recp_test_',
          'recp_',
          'invalid_id',
          'recp_test_1234567890ABCDEF', // uppercase
          'recp_test_1234567890abcdefghijkl' // too long
        ];

        invalidIds.forEach(id => {
          const result = (recipientTools as any).validateRecipientId(id);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateEmail', () => {
      it('should validate correct email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org'
        ];

        validEmails.forEach(email => {
          const result = (recipientTools as any).validateEmail(email);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'test@',
          'test.example.com',
          ''
        ];

        invalidEmails.forEach(email => {
          const result = (recipientTools as any).validateEmail(email);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateTaxId', () => {
      it('should validate correct tax ID formats', () => {
        const validTaxIds = [
          '1234567890123',
          '9876543210987'
        ];

        validTaxIds.forEach(taxId => {
          const result = (recipientTools as any).validateTaxId(taxId);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid tax ID formats', () => {
        const invalidTaxIds = [
          '12345', // too short
          '12345678901234', // too long
          '123456789012a', // contains letter
          '123-456-789-012', // contains dashes
          ''
        ];

        invalidTaxIds.forEach(taxId => {
          const result = (recipientTools as any).validateTaxId(taxId);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateBankAccount', () => {
      it('should validate correct bank account formats', () => {
        const validBankAccounts = [
          { brand: 'bbl', number: '1234567890', name: 'John Doe' },
          { brand: 'ktb', number: '123456789012345', name: 'Jane Smith' },
          { brand: 'scb', number: '9876543210', name: 'Bob Wilson' }
        ];

        validBankAccounts.forEach(bankAccount => {
          const result = (recipientTools as any).validateBankAccount(bankAccount);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject invalid bank account formats', () => {
        const invalidBankAccounts = [
          { bankAccount: null, expectedError: 'Bank account information is required' },
          { bankAccount: { brand: 'invalid', number: '1234567890', name: 'John Doe' }, expectedError: 'Invalid bank brand code' },
          { bankAccount: { brand: 'bbl', number: '123', name: 'John Doe' }, expectedError: 'Invalid bank account number format' },
          { bankAccount: { brand: 'bbl', number: '1234567890', name: '' }, expectedError: 'Invalid account holder name' },
          { bankAccount: { brand: 'bbl', number: '1234567890', name: 'A'.repeat(256) }, expectedError: 'Invalid account holder name' }
        ];

        invalidBankAccounts.forEach(({ bankAccount, expectedError }) => {
          const result = (recipientTools as any).validateBankAccount(bankAccount);
          expect(result.valid).toBe(false);
          expect(result.error).toBe(expectedError);
        });
      });
    });

    describe('sanitizeMetadata', () => {
      it('should sanitize valid metadata', () => {
        const metadata = {
          string: 'value',
          number: 123,
          boolean: true,
          null: null
        };

        const result = (recipientTools as any).sanitizeMetadata(metadata);
        expect(result).toEqual(metadata);
      });

      it('should filter out invalid metadata values', () => {
        const metadata = {
          string: 'value',
          object: { invalid: 'object' },
          array: ['invalid', 'array'],
          function: () => {},
          undefined: undefined
        };

        const result = (recipientTools as any).sanitizeMetadata(metadata);
        expect(result).toEqual({ string: 'value' });
      });

      it('should return undefined for empty metadata', () => {
        const result = (recipientTools as any).sanitizeMetadata({});
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-object input', () => {
        expect((recipientTools as any).sanitizeMetadata(null)).toBeUndefined();
        expect((recipientTools as any).sanitizeMetadata('string')).toBeUndefined();
        expect((recipientTools as any).sanitizeMetadata(123)).toBeUndefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty recipient list', async () => {
      const mockRecipients: OmiseListResponse<OmiseRecipient> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/recipients'
      };

      mockOmiseClient.get.mockResolvedValue(mockRecipients);

      const result = await recipientTools.listRecipients({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('Retrieved 0 recipients (total: 0)');
    });

    it('should handle large recipient list', async () => {
      const mockRecipients: OmiseListResponse<OmiseRecipient> = {
        object: 'list',
        data: Array(100).fill(null).map(() => createMockRecipient()),
        total: 100,
        limit: 100,
        offset: 0,
        order: 'chronological' as const,
        location: '/recipients'
      };

      mockOmiseClient.get.mockResolvedValue(mockRecipients);

      const result = await recipientTools.listRecipients({ limit: 100 });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Retrieved 100 recipients (total: 100)');
    });

    it('should handle undefined values in update', async () => {
      const mockRecipient = createMockRecipient();
      mockOmiseClient.put.mockResolvedValue(mockRecipient);

      const params = {
        recipient_id: 'recp_test_1234567890abcdefghi',
        name: undefined,
        email: undefined,
        description: undefined
      };

      const result = await recipientTools.updateRecipient(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No update data provided. Please provide name, email, description, tax_id, bank_account, or metadata to update.');
    });
  });
});
