/**
 * Customer Tools 単体テスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CustomerTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockCustomer } from '../factories';

// モックの設定
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

    it('should fail with invalid customer ID', async () => {
      // Arrange
      const params = {
        customer_id: 'invalid_id'
      };

      // Act
      const result = await customerTools.retrieveCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer ID format');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
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

    it('should fail without confirmation for customer', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.destroyCustomer(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Customer deletion requires confirmation');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
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

    it('should fail without confirmation for customer', async () => {
      // Arrange
      const params = {
        customer_id: 'cust_1234567890abcdefgha',
        card_id: 'card_1234567890abcdefgha'
      };

      // Act
      const result = await customerTools.destroyCustomerCard(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Card deletion requires confirmation');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });
  });
});
