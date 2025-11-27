/**
 * Dispute Tools Unit Tests
 */

import { DisputeTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import type { OmiseDispute, OmiseDisputeDocument, OmiseListResponse } from '../../src/types';
import { createMockDispute, createMockDisputeDocument } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client.js');
jest.mock('../../src/utils/logger.js');

describe('DisputeTools', () => {
  let disputeTools: DisputeTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({
      baseUrl: 'https://api.omise.co',
      secretKey: 'skey_test_123',
    } as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    disputeTools = new DisputeTools(mockOmiseClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTools', () => {
    it('should return all dispute-related tools', () => {
      const tools = disputeTools.getTools();
      
      expect(tools).toHaveLength(8);
      expect(tools.map(t => t.name)).toEqual([
        'list_disputes',
        'retrieve_dispute',
        'accept_dispute',
        'update_dispute',
        'list_dispute_documents',
        'retrieve_dispute_document',
        'upload_dispute_document',
        'destroy_dispute_document'
      ]);
    });

    it('should have correct tool schemas', () => {
      const tools = disputeTools.getTools();
      
      // Check list_disputes schema
      const listDisputesTool = tools.find(t => t.name === 'list_disputes');
      expect(listDisputesTool?.inputSchema.properties).toHaveProperty('limit');
      expect(listDisputesTool?.inputSchema.properties).toHaveProperty('offset');
      expect(listDisputesTool?.inputSchema.properties).toHaveProperty('order');
      expect(listDisputesTool?.inputSchema.properties).toHaveProperty('status');
      
      // Check retrieve_dispute schema
      const retrieveDisputeTool = tools.find(t => t.name === 'retrieve_dispute');
      expect(retrieveDisputeTool?.inputSchema.required).toEqual(['dispute_id']);
      
      // Check upload_dispute_document schema
      const uploadDocTool = tools.find(t => t.name === 'upload_dispute_document');
      expect(uploadDocTool?.inputSchema.required).toEqual(['dispute_id', 'filename', 'content']);
    });
  });

  describe('listDisputes', () => {
    it('should list disputes successfully with default parameters', async () => {
      const mockDisputes: OmiseListResponse<OmiseDispute> = {
        object: 'list',
        data: [createMockDispute()],
        total: 1,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/disputes'
      };

      mockOmiseClient.get.mockResolvedValue(mockDisputes);

      const result = await disputeTools.listDisputes({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDisputes);
      expect(result.message).toBe('Retrieved 1 disputes (total: 1)');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/disputes', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should list disputes with custom parameters', async () => {
      const mockDisputes: OmiseListResponse<OmiseDispute> = {
        object: 'list',
        data: [createMockDispute()],
        total: 1,
        limit: 10,
        offset: 5,
        order: 'reverse_chronological' as const,
        location: '/disputes'
      };

      mockOmiseClient.get.mockResolvedValue(mockDisputes);

      const params = {
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        status: 'open',
        charge: 'chrg_test_1234567890abcdef',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      };

      const result = await disputeTools.listDisputes(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/disputes', {
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        status: 'open',
        charge: 'chrg_test_1234567890abcdef',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      });
    });

    it('should enforce limit and offset constraints', async () => {
      const mockDisputes: OmiseListResponse<OmiseDispute> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        order: 'chronological' as const,
        location: '/disputes'
      };

      mockOmiseClient.get.mockResolvedValue(mockDisputes);

      const params = {
        limit: 150, // Should be capped at 100
        offset: -5   // Should be set to 0
      };

      await disputeTools.listDisputes(params);

      expect(mockOmiseClient.get).toHaveBeenCalledWith('/disputes', {
        limit: 100,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockOmiseClient.get.mockRejectedValue(error);

      const result = await disputeTools.listDisputes({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list disputes via MCP tool',
        error,
        {}
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.get.mockRejectedValue('String error');

      const result = await disputeTools.listDisputes({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('retrieveDispute', () => {
    it('should retrieve dispute successfully with valid ID', async () => {
      const mockDispute = createMockDispute();
      mockOmiseClient.get.mockResolvedValue(mockDispute);

      const result = await disputeTools.retrieveDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDispute);
      expect(result.message).toBe('Dispute retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/disputes/dspt_test_1234567890abcdefghi');
    });

    it('should validate dispute ID format', async () => {
      const result = await disputeTools.retrieveDispute({
        dispute_id: 'invalid_id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid dispute ID format. Must be in format: dspt_xxxxxxxxxxxxxxxx');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = new Error('Dispute not found');
      mockOmiseClient.get.mockRejectedValue(error);

      const result = await disputeTools.retrieveDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Dispute not found');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.get.mockRejectedValue('String error');

      const result = await disputeTools.retrieveDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('acceptDispute', () => {
    it('should accept dispute successfully', async () => {
      const mockDispute = createMockDispute();
      mockOmiseClient.post.mockResolvedValue(mockDispute);

      const params = {
        dispute_id: 'dspt_test_1234567890abcdefghi',
        message: 'Accepting the dispute',
        metadata: { reason: 'customer_request' }
      };

      const result = await disputeTools.acceptDispute(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDispute);
      expect(result.message).toBe('Dispute accepted successfully');
      expect(mockOmiseClient.post).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/accept',
        {
          message: 'Accepting the dispute',
          metadata: { reason: 'customer_request' }
        }
      );
    });

    it('should accept dispute without optional parameters', async () => {
      const mockDispute = createMockDispute();
      mockOmiseClient.post.mockResolvedValue(mockDispute);

      const result = await disputeTools.acceptDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/accept',
        {}
      );
    });

    it('should validate dispute ID format', async () => {
      const result = await disputeTools.acceptDispute({
        dispute_id: 'invalid_id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid dispute ID format. Must be in format: dspt_xxxxxxxxxxxxxxxx');
    });

    it('should sanitize metadata', async () => {
      const mockDispute = createMockDispute();
      mockOmiseClient.post.mockResolvedValue(mockDispute);

      const params = {
        dispute_id: 'dspt_test_1234567890abcdefghi',
        metadata: {
          valid: 'string',
          number: 123,
          boolean: true,
          null: null,
          invalid: { object: 'should be filtered' }
        }
      };

      await disputeTools.acceptDispute(params);

      expect(mockOmiseClient.post).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/accept',
        {
          metadata: {
            valid: 'string',
            number: 123,
            boolean: true,
            null: null
          }
        }
      );
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to accept');
      mockOmiseClient.post.mockRejectedValue(error);

      const result = await disputeTools.acceptDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to accept');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.post.mockRejectedValue({ code: 'ERROR', message: 'Something went wrong' });

      const result = await disputeTools.acceptDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should handle empty metadata after sanitization', async () => {
      const mockDispute = createMockDispute();
      mockOmiseClient.post.mockResolvedValue(mockDispute);

      const params = {
        dispute_id: 'dspt_test_1234567890abcdefghi',
        metadata: {
          invalid: { object: 'should be filtered' },
          alsoInvalid: ['array']
        }
      };

      await disputeTools.acceptDispute(params);

      expect(mockOmiseClient.post).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/accept',
        {}
      );
    });
  });

  describe('updateDispute', () => {
    it('should update dispute successfully', async () => {
      const mockDispute = createMockDispute();
      mockOmiseClient.put.mockResolvedValue(mockDispute);

      const params = {
        dispute_id: 'dspt_test_1234567890abcdefghi',
        message: 'Updated message',
        metadata: { status: 'updated' }
      };

      const result = await disputeTools.updateDispute(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDispute);
      expect(result.message).toBe('Dispute updated successfully');
      expect(mockOmiseClient.put).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi',
        {
          message: 'Updated message',
          metadata: { status: 'updated' }
        }
      );
    });

    it('should require at least one update field', async () => {
      const result = await disputeTools.updateDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No update data provided. Please provide message or metadata to update.');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should handle undefined values correctly', async () => {
      const mockDispute = createMockDispute();
      mockOmiseClient.put.mockResolvedValue(mockDispute);

      const params = {
        dispute_id: 'dspt_test_1234567890abcdefghi',
        message: undefined,
        metadata: undefined
      };

      const result = await disputeTools.updateDispute(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No update data provided. Please provide message or metadata to update.');
    });

    it('should validate dispute ID format', async () => {
      const result = await disputeTools.updateDispute({
        dispute_id: 'invalid_id',
        message: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid dispute ID format. Must be in format: dspt_xxxxxxxxxxxxxxxx');
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to update');
      mockOmiseClient.put.mockRejectedValue(error);

      const result = await disputeTools.updateDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        message: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.put.mockRejectedValue(null);

      const result = await disputeTools.updateDispute({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        message: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('listDisputeDocuments', () => {
    it('should list dispute documents successfully', async () => {
      const mockDocuments: OmiseListResponse<OmiseDisputeDocument> = {
        object: 'list',
        data: [createMockDisputeDocument()],
        total: 1,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/disputes'
      };

      mockOmiseClient.get.mockResolvedValue(mockDocuments);

      const result = await disputeTools.listDisputeDocuments({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDocuments);
      expect(result.message).toBe('Retrieved 1 documents for dispute (total: 1)');
      expect(mockOmiseClient.get).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/documents',
        { limit: 20, offset: 0 }
      );
    });

    it('should handle custom pagination parameters', async () => {
      const mockDocuments: OmiseListResponse<OmiseDisputeDocument> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 10,
        offset: 5,
        order: 'chronological' as const,
        location: '/disputes'
      };

      mockOmiseClient.get.mockResolvedValue(mockDocuments);

      await disputeTools.listDisputeDocuments({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        limit: 10,
        offset: 5
      });

      expect(mockOmiseClient.get).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/documents',
        { limit: 10, offset: 5 }
      );
    });

    it('should validate dispute ID format', async () => {
      const result = await disputeTools.listDisputeDocuments({
        dispute_id: 'invalid_id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid dispute ID format. Must be in format: dspt_xxxxxxxxxxxxxxxx');
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to list documents');
      mockOmiseClient.get.mockRejectedValue(error);

      const result = await disputeTools.listDisputeDocuments({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to list documents');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.get.mockRejectedValue(123);

      const result = await disputeTools.listDisputeDocuments({
        dispute_id: 'dspt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('retrieveDisputeDocument', () => {
    it('should retrieve dispute document successfully', async () => {
      const mockDocument = createMockDisputeDocument();
      mockOmiseClient.get.mockResolvedValue(mockDocument);

      const result = await disputeTools.retrieveDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'docu_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDocument);
      expect(result.message).toBe('Dispute document retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/documents/docu_test_1234567890abcdefghi'
      );
    });

    it('should validate dispute ID format', async () => {
      const result = await disputeTools.retrieveDisputeDocument({
        dispute_id: 'invalid_id',
        document_id: 'docu_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid dispute ID format. Must be in format: dspt_xxxxxxxxxxxxxxxx');
    });

    it('should validate document ID format', async () => {
      const result = await disputeTools.retrieveDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'invalid_id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid document ID format. Must be in format: docu_xxxxxxxxxxxxxxxx');
    });

    it('should handle API errors', async () => {
      const error = new Error('Document not found');
      mockOmiseClient.get.mockRejectedValue(error);

      const result = await disputeTools.retrieveDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'docu_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document not found');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.get.mockRejectedValue(true);

      const result = await disputeTools.retrieveDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'docu_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('uploadDisputeDocument', () => {
    const validBase64Content = Buffer.from('test content').toString('base64');

    it('should upload dispute document successfully', async () => {
      const mockDocument = createMockDisputeDocument();
      mockOmiseClient.post.mockResolvedValue(mockDocument);

      const params = {
        dispute_id: 'dspt_test_1234567890abcdefghi',
        filename: 'test.pdf',
        content: validBase64Content,
        content_type: 'application/pdf',
        description: 'Test document'
      };

      const result = await disputeTools.uploadDisputeDocument(params);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDocument);
      expect(result.message).toBe(`Dispute document uploaded successfully with ID: ${mockDocument.id}`);
      expect(mockOmiseClient.post).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/documents',
        {
          filename: 'test.pdf',
          content: validBase64Content,
          content_type: 'application/pdf',
          description: 'Test document'
        }
      );
    });

    it('should upload document with default content type', async () => {
      const mockDocument = createMockDisputeDocument();
      mockOmiseClient.post.mockResolvedValue(mockDocument);

      const params = {
        dispute_id: 'dspt_test_1234567890abcdefghi',
        filename: 'test.pdf',
        content: validBase64Content
      };

      await disputeTools.uploadDisputeDocument(params);

      expect(mockOmiseClient.post).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/documents',
        {
          filename: 'test.pdf',
          content: validBase64Content,
          content_type: 'application/pdf'
        }
      );
    });

    it('should validate dispute ID format', async () => {
      const result = await disputeTools.uploadDisputeDocument({
        dispute_id: 'invalid_id',
        filename: 'test.pdf',
        content: validBase64Content
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid dispute ID format. Must be in format: dspt_xxxxxxxxxxxxxxxx');
    });

    it('should validate base64 content', async () => {
      const result = await disputeTools.uploadDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        filename: 'test.pdf',
        content: 'invalid_base64!@#'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid document content. Must be valid base64 encoded data (max 10MB)');
    });

    it('should validate content type', async () => {
      const result = await disputeTools.uploadDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        filename: 'test.pdf',
        content: validBase64Content,
        content_type: 'invalid/type'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid content type. Must be one of: application/pdf, image/jpeg, image/png, image/gif, text/plain');
    });

    it('should validate file size limit', async () => {
      // Create content larger than 10MB
      const largeContent = Buffer.alloc(11 * 1024 * 1024).toString('base64');

      const result = await disputeTools.uploadDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        filename: 'large.pdf',
        content: largeContent
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid document content. Must be valid base64 encoded data (max 10MB)');
    });

    it('should handle API errors', async () => {
      const error = new Error('Upload failed');
      mockOmiseClient.post.mockRejectedValue(error);

      const result = await disputeTools.uploadDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        filename: 'test.pdf',
        content: validBase64Content
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.post.mockRejectedValue({ error: 'Something went wrong' });

      const result = await disputeTools.uploadDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        filename: 'test.pdf',
        content: validBase64Content
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('destroyDisputeDocument', () => {
    it('should destroy dispute document successfully with confirmation', async () => {
      const mockDocument = createMockDisputeDocument();
      mockOmiseClient.delete.mockResolvedValue(mockDocument);

      const result = await disputeTools.destroyDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'docu_test_1234567890abcdefghi',
        confirm: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDocument);
      expect(result.message).toBe('Dispute document deleted successfully');
      expect(mockOmiseClient.delete).toHaveBeenCalledWith(
        '/disputes/dspt_test_1234567890abcdefghi/documents/docu_test_1234567890abcdefghi'
      );
    });

    it('should require confirmation for deletion', async () => {
      const result = await disputeTools.destroyDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'docu_test_1234567890abcdefghi',
        confirm: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document deletion requires confirmation. Set confirm=true to proceed.');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should validate dispute ID format', async () => {
      const result = await disputeTools.destroyDisputeDocument({
        dispute_id: 'invalid_id',
        document_id: 'docu_test_1234567890abcdefghi',
        confirm: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid dispute ID format. Must be in format: dspt_xxxxxxxxxxxxxxxx');
    });

    it('should validate document ID format', async () => {
      const result = await disputeTools.destroyDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'invalid_id',
        confirm: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid document ID format. Must be in format: docu_xxxxxxxxxxxxxxxx');
    });

    it('should handle API errors', async () => {
      const error = new Error('Delete failed');
      mockOmiseClient.delete.mockRejectedValue(error);

      const result = await disputeTools.destroyDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'docu_test_1234567890abcdefghi',
        confirm: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.delete.mockRejectedValue('String error');

      const result = await disputeTools.destroyDisputeDocument({
        dispute_id: 'dspt_test_1234567890abcdefghi',
        document_id: 'docu_test_1234567890abcdefghi',
        confirm: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Validation Functions', () => {
    describe('validateDisputeId', () => {
      it('should validate correct dispute ID formats', () => {
        const validIds = [
          'dspt_test_1234567890abcdefghi',
          'dspt_1234567890abcdefghi'
        ];

        validIds.forEach(id => {
          const result = (disputeTools as any).validateDisputeId(id);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid dispute ID formats', () => {
        const invalidIds = [
          'dspt_invalid',
          'dspt_test_',
          'dspt_',
          'invalid_id',
          'dspt_test_1234567890ABCDEF', // uppercase
          'dspt_test_1234567890abcdefghijkl' // too long
        ];

        invalidIds.forEach(id => {
          const result = (disputeTools as any).validateDisputeId(id);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateDocumentId', () => {
      it('should validate correct document ID formats', () => {
        const validIds = [
          'docu_test_1234567890abcdefghi',
          'docu_1234567890abcdefghi'
        ];

        validIds.forEach(id => {
          const result = (disputeTools as any).validateDocumentId(id);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid document ID formats', () => {
        const invalidIds = [
          'docu_invalid',
          'docu_test_',
          'docu_',
          'invalid_id',
          'docu_test_1234567890ABCDEF', // uppercase
          'docu_test_1234567890abcdefghijkl' // too long
        ];

        invalidIds.forEach(id => {
          const result = (disputeTools as any).validateDocumentId(id);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateContentType', () => {
      it('should validate correct content types', () => {
        const validTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'text/plain'
        ];

        validTypes.forEach(type => {
          const result = (disputeTools as any).validateContentType(type);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid content types', () => {
        const invalidTypes = [
          'application/json',
          'text/html',
          'video/mp4',
          'invalid/type'
        ];

        invalidTypes.forEach(type => {
          const result = (disputeTools as any).validateContentType(type);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateBase64Content', () => {
      it('should validate correct base64 content', () => {
        const validContent = Buffer.from('test content').toString('base64');
        const result = (disputeTools as any).validateBase64Content(validContent);
        expect(result).toBe(true);
      });

      it('should reject invalid base64 content', () => {
        const invalidContent = [
          'invalid_base64!@#',
          'not-base64',
          '',
          '1234567890abcdef===' // invalid padding
        ];

        invalidContent.forEach(content => {
          const result = (disputeTools as any).validateBase64Content(content);
          expect(result).toBe(false);
        });
      });

      it('should reject content larger than 10MB', () => {
        const largeContent = Buffer.alloc(11 * 1024 * 1024).toString('base64');
        const result = (disputeTools as any).validateBase64Content(largeContent);
        expect(result).toBe(false);
      });

      it('should handle Buffer.from exceptions in catch block', () => {
        // Mock Buffer.from to throw an error to test catch block
        const originalBufferFrom = Buffer.from;
        const mockBufferFrom = jest.fn().mockImplementation(() => {
          throw new Error('Invalid base64');
        });
        Buffer.from = mockBufferFrom as any;

        // Use a string that passes regex but will fail in Buffer.from
        const invalidContent = 'dGVzdA==';
        const result = (disputeTools as any).validateBase64Content(invalidContent);
        expect(result).toBe(false);

        // Restore original
        Buffer.from = originalBufferFrom;
      });

      it('should reject empty buffer after decoding', () => {
        // Create base64 string that decodes to empty buffer
        // Empty string passed as base64
        const emptyContent = '';
        const result = (disputeTools as any).validateBase64Content(emptyContent);
        expect(result).toBe(false);
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

        const result = (disputeTools as any).sanitizeMetadata(metadata);
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

        const result = (disputeTools as any).sanitizeMetadata(metadata);
        expect(result).toEqual({ string: 'value' });
      });

      it('should return undefined for empty metadata', () => {
        const result = (disputeTools as any).sanitizeMetadata({});
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-object input', () => {
        expect((disputeTools as any).sanitizeMetadata(null)).toBeUndefined();
        expect((disputeTools as any).sanitizeMetadata('string')).toBeUndefined();
        expect((disputeTools as any).sanitizeMetadata(123)).toBeUndefined();
      });
    });
  });
});
