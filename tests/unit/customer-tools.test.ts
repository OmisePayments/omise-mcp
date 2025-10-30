/**
 * Customer Tools Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CustomerTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockCustomer } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client');
jest.mock('../../src/utils/logger');

describe('CustomerTools', () => {
  let customerTools: CustomerTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    customerTools = new CustomerTools(mockOmiseClient, mockLogger);
    jest.clearAllMocks();
  });

  describe('getTools', () => {
    it('should return all customer tools with correct structure', () => {
      // Act
      const tools = customerTools.getTools();

      // Assert
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for key tools
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('create_customer');
      expect(toolNames).toContain('retrieve_customer');
      expect(toolNames).toContain('list_customers');
      expect(toolNames).toContain('update_customer');
      expect(toolNames).toContain('destroy_customer');
      expect(toolNames).toContain('list_customer_cards');
      expect(toolNames).toContain('retrieve_customer_card');
      expect(toolNames).toContain('update_customer_card');
      expect(toolNames).toContain('destroy_customer_card');

      // Check tool structure
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
      });
    });
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const params = {
        email: 'test@example.com',
        description: 'Test customer'
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(result.message).toContain('Customer created successfully');
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        description: 'Test customer',
        metadata: {}
      });
    });

    it('should create a customer with metadata', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const params = {
        email: 'test@example.com',
        metadata: {
          user_id: '123',
          plan: 'premium'
        }
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {
          user_id: '123',
          plan: 'premium'
        }
      });
    });

    it('should create a customer with card token', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const params = {
        email: 'test@example.com',
        card: 'tokn_1234567890abcdefghi'
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {},
        card: 'tokn_1234567890abcdefghi'
      });
    });

    it('should create a customer with default_card', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const params = {
        email: 'test@example.com',
        default_card: 'card_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {},
        default_card: 'card_1234567890abcdefgha'
      });
    });

    it('should create a customer without email', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const params = {
        description: 'Test customer without email'
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        description: 'Test customer without email',
        metadata: {}
      });
    });

    it('should sanitize metadata - filter out non-string values', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const params = {
        email: 'test@example.com',
        metadata: {
          valid: 'string',
          invalid: 123,
          nullValue: null,
          boolValue: true,
          objectValue: { nested: 'value' }
        }
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {
          valid: 'string'
        }
      });
    });

    it('should sanitize metadata - filter out values longer than 255 chars', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const longString = 'a'.repeat(256);
      const validString = 'a'.repeat(255);

      const params = {
        email: 'test@example.com',
        metadata: {
          valid: validString,
          invalid: longString
        }
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {
          valid: validString
        }
      });
    });

    it('should handle null metadata', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const params = {
        email: 'test@example.com',
        metadata: null
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {}
      });
    });

    it('should fail with invalid email address', async () => {
      // Arrange
      const params = {
        email: 'invalid-email',
        description: 'Test customer'
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
      expect(mockOmiseClient.createCustomer).not.toHaveBeenCalled();
    });

    it('should fail with various invalid email formats', async () => {
      // Arrange
      const invalidEmails = [
        'no-at-sign.com',
        '@nodomain.com',
        'nodomain@',
        'spaces in@email.com',
        'invalid@.com',
        'invalid@com'
      ];

      for (const email of invalidEmails) {
        // Act
        const result = await customerTools.createCustomer({ email });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid email format');
      }

      expect(mockOmiseClient.createCustomer).not.toHaveBeenCalled();
    });

    it('should allow empty email (email is optional)', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.createCustomer.mockResolvedValue(mockCustomer);

      const params = {
        email: ''
      };

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      // Empty email should pass validation (email is optional)
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createCustomer).toHaveBeenCalledWith({
        email: '',
        metadata: {}
      });
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        email: 'test@example.com',
        description: 'Test customer'
      };

      mockOmiseClient.createCustomer.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        email: 'test@example.com'
      };

      mockOmiseClient.createCustomer.mockRejectedValue('String error');

      // Act
      const result = await customerTools.createCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('retrieveCustomer', () => {
    it('should retrieve a customer successfully', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.getCustomer.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.retrieveCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(mockOmiseClient.getCustomer).toHaveBeenCalledWith('cust_1234567890abcdefgha');
    });

    it('should retrieve a customer with test mode ID', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.getCustomer.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_test_1234567890abcdefghi'
      };

      // Act
      const result = await customerTools.retrieveCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(mockOmiseClient.getCustomer).toHaveBeenCalledWith('cust_test_1234567890abcdefghi');
    });

    it('should fail with various invalid customer ID formats', async () => {
      // Arrange
      const invalidIds = [
        'invalid_id', // no prefix
        'cust_',
        'cust_123',
        'customer_1234567890abcdefgha',
        'cust_1234567890ABCDEFGHA', // uppercase
        'cust_1234567890@#$%^&*()', // special chars
        '',
        '1234567890abcdefgha'
      ];

      for (const id of invalidIds) {
        // Act
        const result = await customerTools.retrieveCustomer({ customer_id: id });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid customer ID format');
      }

      expect(mockOmiseClient.getCustomer).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      mockOmiseClient.getCustomer.mockRejectedValue(new Error('Customer not found'));

      // Act
      const result = await customerTools.retrieveCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer not found');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      mockOmiseClient.getCustomer.mockRejectedValue('String error');

      // Act
      const result = await customerTools.retrieveCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('listCustomers', () => {
    it('should list customers successfully', async () => {
      // Arrange
      const mockCustomers = {
        object: 'list' as const,
        data: [createMockCustomer(), createMockCustomer()],
        total: 2,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/customers'
      };
      mockOmiseClient.listCustomers.mockResolvedValue(mockCustomers);

      const params = {
        limit: 20,
        offset: 0
      };

      // Act
      const result = await customerTools.listCustomers(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomers);
      expect(mockOmiseClient.listCustomers).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    });

    it('should list customers with default pagination', async () => {
      // Arrange
      const mockCustomers = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/customers'
      };
      mockOmiseClient.listCustomers.mockResolvedValue(mockCustomers);

      // Act
      const result = await customerTools.listCustomers({});

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCustomers).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    });

    it('should list customers with order parameter', async () => {
      // Arrange
      const mockCustomers = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'reverse_chronological' as const,
        location: '/customers'
      };
      mockOmiseClient.listCustomers.mockResolvedValue(mockCustomers);

      const params = {
        order: 'reverse_chronological' as const
      };

      // Act
      const result = await customerTools.listCustomers(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCustomers).toHaveBeenCalledWith({ 
        limit: 20, 
        offset: 0,
        order: 'reverse_chronological'
      });
    });

    it('should list customers with date filters', async () => {
      // Arrange
      const mockCustomers = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/customers'
      };
      mockOmiseClient.listCustomers.mockResolvedValue(mockCustomers);

      const params = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      };

      // Act
      const result = await customerTools.listCustomers(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.listCustomers).toHaveBeenCalledWith({ 
        limit: 20, 
        offset: 0,
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      });
    });

    it('should list customers with all parameters', async () => {
      // Arrange
      const mockCustomers = {
        object: 'list' as const,
        data: [],
        total: 0,
        limit: 50,
        offset: 10,
        order: 'reverse_chronological' as const,
        location: '/customers'
      };
      mockOmiseClient.listCustomers.mockResolvedValue(mockCustomers);

      const params = {
        limit: 50,
        offset: 10,
        order: 'reverse_chronological' as const,
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      };

      // Act
      const result = await customerTools.listCustomers(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 0 customers');
      expect(mockOmiseClient.listCustomers).toHaveBeenCalledWith(params);
    });

    it('should fail when API call fails', async () => {
      // Arrange
      mockOmiseClient.listCustomers.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await customerTools.listCustomers({});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      mockOmiseClient.listCustomers.mockRejectedValue('String error');

      // Act
      const result = await customerTools.listCustomers({});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('updateCustomer', () => {
    it('should update a customer successfully', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        email: 'updated@example.com'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        email: 'updated@example.com'
      });
    });

    it('should update customer with test mode ID', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_test_1234567890abcdefghi',
        email: 'updated@example.com'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_test_1234567890abcdefghi', {
        email: 'updated@example.com'
      });
    });

    it('should update customer description', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        description: 'Updated description'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        description: 'Updated description'
      });
    });

    it('should update customer metadata', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        metadata: {
          user_id: '123',
          plan: 'premium'
        }
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        metadata: {
          user_id: '123',
          plan: 'premium'
        }
      });
    });

    it('should update customer default_card', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        default_card: 'card_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        default_card: 'card_1234567890abcdefgha'
      });
    });

    it('should update customer with empty description', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        description: ''
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        description: ''
      });
    });

    it('should sanitize metadata when updating', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        metadata: {
          valid: 'string',
          invalid: 123,
          nullValue: null
        }
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        metadata: {
          valid: 'string'
        }
      });
    });

    it('should add card to customer using token', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card: 'tokn_1234567890abcdefghi'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        card: 'tokn_1234567890abcdefghi'
      });
    });

    it('should add card to customer using test mode token', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card: 'tokn_test_1234567890abcdefghi'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        card: 'tokn_test_1234567890abcdefghi'
      });
    });

    it('should update customer with all fields', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockOmiseClient.put.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        email: 'updated@example.com',
        description: 'Updated description',
        default_card: 'card_1234567890abcdefgha',
        metadata: {
          key: 'value'
        }
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha', {
        email: 'updated@example.com',
        description: 'Updated description',
        default_card: 'card_1234567890abcdefgha',
        metadata: {
          key: 'value'
        }
      });
    });

    it('should fail with invalid customer ID', async () => {
      // Arrange
      const params = {
        customer_id: 'invalid_id',
        email: 'updated@example.com'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer ID format');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid email format', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        email: 'invalid-email'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid token ID', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card: 'invalid_token'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token ID format');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with various invalid token ID formats', async () => {
      // Arrange
      const invalidTokens = [
        'tokn_',
        'tokn_123',
        'token_1234567890abcdefghi',
        'tokn_1234567890ABCDEFGHI', // uppercase
        'tokn_1234567890@#$%^&*()', // special chars
        ''
      ];

      for (const token of invalidTokens) {
        // Act
        const result = await customerTools.updateCustomer({
          customer_id: 'cust_1234567890abcdefgha',
          card: token
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid token ID format');
      }

      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with no update data', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No update data provided');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        email: 'updated@example.com'
      };

      mockOmiseClient.put.mockRejectedValue(new Error('Update failed'));

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        email: 'updated@example.com'
      };

      mockOmiseClient.put.mockRejectedValue('String error');

      // Act
      const result = await customerTools.updateCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('destroyCustomer', () => {
    it('should delete a customer successfully', async () => {
      // Arrange
      const mockCustomer = createMockCustomer({ deleted: true });
      mockOmiseClient.delete.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        confirm: true
      };

      // Act
      const result = await customerTools.destroyCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(mockOmiseClient.delete).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha');
    });

    it('should delete a customer with test mode ID', async () => {
      // Arrange
      const mockCustomer = createMockCustomer({ deleted: true });
      mockOmiseClient.delete.mockResolvedValue(mockCustomer);

      const params = {
        customer_id: 'cust_test_1234567890abcdefghi',
        confirm: true
      };

      // Act
      const result = await customerTools.destroyCustomer(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.delete).toHaveBeenCalledWith('/customers/cust_test_1234567890abcdefghi');
    });

    it('should fail with invalid customer ID', async () => {
      // Arrange
      const params = {
        customer_id: 'invalid_id',
        confirm: true
      };

      // Act
      const result = await customerTools.destroyCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer ID format');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should fail when confirmation is missing or false', async () => {
      // Arrange - test both undefined and false cases
      const params1 = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      const params2 = {
        customer_id: 'cust_1234567890abcdefgha',
        confirm: false
      };

      // Act & Assert
      const result1 = await customerTools.destroyCustomer(params1);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Customer deletion requires confirmation');

      const result2 = await customerTools.destroyCustomer(params2);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Customer deletion requires confirmation');

      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        confirm: true
      };

      mockOmiseClient.delete.mockRejectedValue(new Error('Delete failed'));

      // Act
      const result = await customerTools.destroyCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        confirm: true
      };

      mockOmiseClient.delete.mockRejectedValue('String error');

      // Act
      const result = await customerTools.destroyCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('listCustomerCards', () => {
    it('should list customer cards successfully', async () => {
      // Arrange
      const mockCards = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/customers/cust_1234567890abcdefgha/cards'
      };
      mockOmiseClient.get.mockResolvedValue(mockCards);

      const params = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.listCustomerCards(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCards);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha/cards', { limit: 20, offset: 0 });
    });

    it('should list customer cards with pagination', async () => {
      // Arrange
      const mockCards = {
        object: 'list',
        data: [],
        total: 0,
        limit: 50,
        offset: 10,
        order: 'chronological',
        location: '/customers/cust_1234567890abcdefgha/cards'
      };
      mockOmiseClient.get.mockResolvedValue(mockCards);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        limit: 50,
        offset: 10
      };

      // Act
      const result = await customerTools.listCustomerCards(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha/cards', { limit: 50, offset: 10 });
    });

    it('should list customer cards with test mode ID', async () => {
      // Arrange
      const mockCards = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological',
        location: '/customers/cust_test_1234567890abcdefghihi/cards'
      };
      mockOmiseClient.get.mockResolvedValue(mockCards);

      const params = {
        customer_id: 'cust_test_1234567890abcdefghi'
      };

      // Act
      const result = await customerTools.listCustomerCards(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/customers/cust_test_1234567890abcdefghi/cards', { limit: 20, offset: 0 });
    });

    it('should fail with invalid customer ID', async () => {
      // Arrange
      const params = {
        customer_id: 'invalid_id'
      };

      // Act
      const result = await customerTools.listCustomerCards(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      mockOmiseClient.get.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await customerTools.listCustomerCards(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      mockOmiseClient.get.mockRejectedValue('String error');

      // Act
      const result = await customerTools.listCustomerCards(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('retrieveCustomerCard', () => {
    it('should retrieve a customer card successfully', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_1234567890abcdefgha',
        brand: 'Visa',
        last_digits: '1234'
      };
      mockOmiseClient.get.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.retrieveCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCard);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha/cards/card_1234567890abcdefgha');
    });

    it('should retrieve a customer card with test mode IDs', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_test_1234567890abcdefghi',
        brand: 'Visa',
        last_digits: '1234'
      };
      mockOmiseClient.get.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_test_1234567890abcdefghi',
        card_id: 'card_test_1234567890abcdefghi'
      };

      // Act
      const result = await customerTools.retrieveCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/customers/cust_test_1234567890abcdefghi/cards/card_test_1234567890abcdefghi');
    });

    it('should fail with invalid customer ID', async () => {
      // Arrange
      const params = {
        customer_id: 'invalid_id',
        card_id: 'card_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.retrieveCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail with invalid card ID', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'invalid_card'
      };

      // Act
      const result = await customerTools.retrieveCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid card ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail with various invalid card ID formats', async () => {
      // Arrange
      const invalidCardIds = [
        'card_',
        'card_123',
        'cards_1234567890abcdefgha',
        'card_1234567890ABCDEFGHA', // uppercase
        'card_1234567890@#$%^&*()', // special chars
        ''
      ];

      for (const cardId of invalidCardIds) {
        // Act
        const result = await customerTools.retrieveCustomerCard({
          customer_id: 'cust_1234567890abcdefgha',
          card_id: cardId
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid card ID format');
      }

      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha'
      };

      mockOmiseClient.get.mockRejectedValue(new Error('Card not found'));

      // Act
      const result = await customerTools.retrieveCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Card not found');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha'
      };

      mockOmiseClient.get.mockRejectedValue('String error');

      // Act
      const result = await customerTools.retrieveCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('updateCustomerCard', () => {
    it('should update a customer card successfully', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_1234567890abcdefgha',
        brand: 'Visa',
        last_digits: '1234'
      };
      mockOmiseClient.put.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        name: 'Updated Name'
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCard);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha/cards/card_1234567890abcdefgha', {
        name: 'Updated Name'
      });
    });

    it('should update card expiration month and year', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_1234567890abcdefgha',
        brand: 'Visa',
        expiration_month: 12,
        expiration_year: 2025
      };
      mockOmiseClient.put.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        expiration_month: 12,
        expiration_year: 2025
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha/cards/card_1234567890abcdefgha', {
        expiration_month: 12,
        expiration_year: 2025
      });
    });

    it('should update card city and postal code', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_1234567890abcdefgha',
        brand: 'Visa',
        city: 'Bangkok',
        postal_code: '10110'
      };
      mockOmiseClient.put.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        city: 'Bangkok',
        postal_code: '10110'
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha/cards/card_1234567890abcdefgha', {
        city: 'Bangkok',
        postal_code: '10110'
      });
    });

    it('should update card with all fields', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_1234567890abcdefgha',
        brand: 'Visa',
        name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        city: 'Bangkok',
        postal_code: '10110'
      };
      mockOmiseClient.put.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        city: 'Bangkok',
        postal_code: '10110'
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha/cards/card_1234567890abcdefgha', {
        name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        city: 'Bangkok',
        postal_code: '10110'
      });
    });

    it('should update card with test mode IDs', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_test_1234567890abcdefghi',
        brand: 'Visa'
      };
      mockOmiseClient.put.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_test_1234567890abcdefghi',
        card_id: 'card_test_1234567890abcdefghi',
        name: 'Updated Name'
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.put).toHaveBeenCalledWith('/customers/cust_test_1234567890abcdefghi/cards/card_test_1234567890abcdefghi', {
        name: 'Updated Name'
      });
    });

    it('should fail with invalid expiration month (less than 1)', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        expiration_month: 0
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid expiration month');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid expiration month (greater than 12)', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        expiration_month: 13
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid expiration month');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid expiration year (less than 2024)', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        expiration_year: 2023
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid expiration year');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid customer ID', async () => {
      // Arrange
      const params = {
        customer_id: 'invalid_id',
        card_id: 'card_1234567890abcdefgha',
        name: 'Updated Name'
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer ID format');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with invalid card ID', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'invalid_card',
        name: 'Updated Name'
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid card ID format');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail with no update data', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No update data provided');
      expect(mockOmiseClient.put).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        name: 'Updated Name'
      };

      mockOmiseClient.put.mockRejectedValue(new Error('Update failed'));

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        name: 'Updated Name'
      };

      mockOmiseClient.put.mockRejectedValue('String error');

      // Act
      const result = await customerTools.updateCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('destroyCustomerCard', () => {
    it('should delete a customer card successfully', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_1234567890abcdefgha',
        deleted: true
      };
      mockOmiseClient.delete.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        confirm: true
      };

      // Act
      const result = await customerTools.destroyCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCard);
      expect(mockOmiseClient.delete).toHaveBeenCalledWith('/customers/cust_1234567890abcdefgha/cards/card_1234567890abcdefgha');
    });

    it('should delete a customer card with test mode IDs', async () => {
      // Arrange
      const mockCard = {
        object: 'card',
        id: 'card_test_1234567890abcdefghi',
        deleted: true
      };
      mockOmiseClient.delete.mockResolvedValue(mockCard);

      const params = {
        customer_id: 'cust_test_1234567890abcdefghi',
        card_id: 'card_test_1234567890abcdefghi',
        confirm: true
      };

      // Act
      const result = await customerTools.destroyCustomerCard(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.delete).toHaveBeenCalledWith('/customers/cust_test_1234567890abcdefghi/cards/card_test_1234567890abcdefghi');
    });

    it('should fail with invalid customer ID', async () => {
      // Arrange
      const params = {
        customer_id: 'invalid_id',
        card_id: 'card_1234567890abcdefgha',
        confirm: true
      };

      // Act
      const result = await customerTools.destroyCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer ID format');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should fail with invalid card ID', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'invalid_card',
        confirm: true
      };

      // Act
      const result = await customerTools.destroyCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid card ID format');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should fail when confirmation is missing or false', async () => {
      // Arrange - test both undefined and false cases
      const params1 = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha'
      };

      const params2 = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        confirm: false
      };

      // Act & Assert
      const result1 = await customerTools.destroyCustomerCard(params1);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Card deletion requires confirmation');

      const result2 = await customerTools.destroyCustomerCard(params2);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Card deletion requires confirmation');

      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        confirm: true
      };

      mockOmiseClient.delete.mockRejectedValue(new Error('Delete failed'));

      // Act
      const result = await customerTools.destroyCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha',
        confirm: true
      };

      mockOmiseClient.delete.mockRejectedValue('String error');

      // Act
      const result = await customerTools.destroyCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });
});
