/**
 * API Integration Tests
 * 
 * These tests mock the HTTP layer (axios) to test integration between
 * components without hitting real APIs or external services.
 */

import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { PaymentTools } from '../../src/tools';
import { CustomerTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockCharge, createMockCustomer } from '../factories';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Integration Tests', () => {
  let paymentTools: PaymentTools;
  let customerTools: CustomerTools;
  let omiseClient: OmiseClient;
  let logger: Logger;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;

  beforeAll(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn()
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Initialize client for integration tests
    // All HTTP requests will be mocked via axios
    const config = {
      secretKey: 'skey_test_1234567890',
      environment: 'test' as const,
      apiVersion: '2017-11-02',
      baseUrl: 'https://api.omise.co',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    };

    logger = new Logger({
      omise: config,
      server: { name: 'test', version: '1.0.0', description: 'Test', port: 3000, host: 'localhost' },
      logging: { level: 'error', format: 'simple', enableRequestLogging: false, enableResponseLogging: false },
      tools: { allowed: 'all' }
    });

    omiseClient = new OmiseClient(config, logger);
    paymentTools = new PaymentTools(omiseClient, logger);
    customerTools = new CustomerTools(omiseClient, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Flow Integration', () => {
    it('should create customer and charge integration test', async () => {
      // Mock customer creation
      const mockCustomer = createMockCustomer({
        email: 'integration-test@example.com',
        description: 'Integration test customer'
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockCustomer,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 1. Create customer
      const customerResult = await customerTools.createCustomer({
        email: 'integration-test@example.com',
        description: 'Integration test customer'
      });
      
      expect(customerResult.success).toBe(true);
      expect(customerResult.data).toBeDefined();
      const customerId = customerResult.data?.id;
      expect(customerId).toBeDefined();

      // Mock charge creation
      const mockCharge = createMockCharge({
        amount: 1000,
        currency: 'THB',
        customer: customerId,
        description: 'Integration test charge'
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockCharge,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 2. Create charge for customer
      const chargeResult = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        customer: customerId,
        description: 'Integration test charge'
      });

      expect(chargeResult.success).toBe(true);
      expect(chargeResult.data).toBeDefined();
      expect(chargeResult.data?.customer).toBe(customerId);
    });

    it('should create charge and retrieve integration test', async () => {
      // Mock charge creation
      const mockCharge = createMockCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Integration test charge for refund'
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockCharge,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 1. Create charge
      const chargeResult = await paymentTools.createCharge({
        amount: 1000,
        currency: 'THB',
        description: 'Integration test charge for refund'
      });

      expect(chargeResult.success).toBe(true);
      const chargeId = chargeResult.data?.id;
      expect(chargeId).toBeDefined();

      // Mock charge retrieval
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockCharge,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 2. Retrieve charge to verify
      const retrieveResult = await paymentTools.retrieveCharge({ charge_id: chargeId });
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data?.id).toBe(chargeId);
    });
  });

  describe('Customer Management Integration', () => {
    it('should create, update, and retrieve customer integration test', async () => {
      // Mock customer creation
      const mockCustomer = createMockCustomer({
        email: 'integration-crud@example.com',
        description: 'Integration CRUD test customer'
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockCustomer,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 1. Create customer
      const createResult = await customerTools.createCustomer({
        email: 'integration-crud@example.com',
        description: 'Integration CRUD test customer'
      });

      expect(createResult.success).toBe(true);
      const customerId = createResult.data?.id;
      expect(customerId).toBeDefined();

      // Mock customer update
      const updatedCustomer = createMockCustomer({
        id: customerId,
        email: 'updated-integration@example.com',
        description: 'Updated integration test customer'
      });

      mockAxiosInstance.put.mockResolvedValueOnce({
        data: updatedCustomer,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 2. Update customer
      const updateResult = await customerTools.updateCustomer({
        customer_id: customerId,
        email: 'updated-integration@example.com',
        description: 'Updated integration test customer'
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.email).toBe('updated-integration@example.com');

      // Mock customer retrieval
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: updatedCustomer,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 3. Retrieve customer to verify
      const retrieveResult = await customerTools.retrieveCustomer({ customer_id: customerId });
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data?.email).toBe('updated-integration@example.com');
    });
  });

  describe('List Operations Integration', () => {
    it('should test customer list and charge list integration', async () => {
      // Mock customer list
      const mockCustomersList = {
        object: 'list',
        data: Array.from({ length: 5 }, () => createMockCustomer()),
        total: 10,
        limit: 5,
        offset: 0,
        order: 'chronological',
        location: '/customers'
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockCustomersList,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 1. Get customer list
      const customersResult = await customerTools.listCustomers({
        limit: 5,
        offset: 0
      });

      expect(customersResult.success).toBe(true);
      expect(customersResult.data).toBeDefined();
      expect(Array.isArray(customersResult.data?.data)).toBe(true);

      // Mock charge list
      const mockChargesList = {
        object: 'list',
        data: Array.from({ length: 5 }, () => createMockCharge()),
        total: 10,
        limit: 5,
        offset: 0,
        order: 'chronological',
        location: '/charges'
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockChargesList,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // 2. Get charge list
      const chargesResult = await paymentTools.listCharges({
        limit: 5,
        offset: 0
      });

      expect(chargesResult.success).toBe(true);
      expect(chargesResult.data).toBeDefined();
      expect(Array.isArray(chargesResult.data?.data)).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle access to non-existent resources', async () => {
      // Mock 404 error
      const errorResponse: AxiosError = {
        response: {
          data: {
            object: 'error',
            code: 'not_found',
            message: 'Charge not found'
          },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any
        },
        config: {} as any,
        message: 'Request failed with status code 404',
        name: 'AxiosError',
        isAxiosError: true,
        toJSON: () => ({})
      };

      mockAxiosInstance.get.mockRejectedValueOnce(errorResponse);

      // Try to retrieve with non-existent charge ID
      const result = await paymentTools.retrieveCharge({
        charge_id: 'chrg_nonexistent'
      });

      // Expect error response
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle creation with invalid parameters', async () => {
      // This should be caught by validation before API call
      // Try to create charge with invalid amount
      const result = await paymentTools.createCharge({
        amount: -100,
        currency: 'THB',
        description: 'Invalid amount test'
      });

      // Expect validation error (no API call made)
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });
  });

  describe('Pagination Integration', () => {
    it('should test pagination functionality', async () => {
      // Mock first page
      const firstPageList = {
        object: 'list',
        data: Array.from({ length: 2 }, () => createMockCustomer()),
        total: 10,
        limit: 2,
        offset: 0,
        order: 'chronological',
        location: '/customers'
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: firstPageList,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // Get first page
      const firstPage = await customerTools.listCustomers({
        limit: 2,
        offset: 0
      });

      expect(firstPage.success).toBe(true);
      expect(firstPage.data?.limit).toBe(2);
      expect(firstPage.data?.offset).toBe(0);

      // Mock second page
      const secondPageList = {
        object: 'list',
        data: Array.from({ length: 2 }, () => createMockCustomer()),
        total: 10,
        limit: 2,
        offset: 2,
        order: 'chronological',
        location: '/customers'
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: secondPageList,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      // Get second page
      const secondPage = await customerTools.listCustomers({
        limit: 2,
        offset: 2
      });

      expect(secondPage.success).toBe(true);
      expect(secondPage.data?.limit).toBe(2);
      expect(secondPage.data?.offset).toBe(2);
    });
  });

  describe('Filtering Integration', () => {
    it('should test date range filtering', async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      const toDate = new Date();

      // Mock filtered charge list
      const filteredList = {
        object: 'list',
        data: Array.from({ length: 10 }, () => createMockCharge()),
        total: 10,
        limit: 10,
        offset: 0,
        order: 'chronological',
        location: '/charges'
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: filteredList,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as AxiosResponse);

      const result = await paymentTools.listCharges({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Concurrent Operations Integration', () => {
    it('should test concurrent operations', async () => {
      // Mock multiple concurrent customer creations
      const mockCustomers = Array.from({ length: 3 }, (_, index) =>
        createMockCustomer({
          email: `concurrent-test-${index}@example.com`,
          description: `Concurrent test customer ${index}`
        })
      );

      // Mock all POST requests for concurrent creation
      mockCustomers.forEach(customer => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: customer,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any
        } as AxiosResponse);
      });

      // Create multiple customers concurrently
      const promises = Array.from({ length: 3 }, (_, index) => 
        customerTools.createCustomer({
          email: `concurrent-test-${index}@example.com`,
          description: `Concurrent test customer ${index}`
        })
      );

      const results = await Promise.all(promises);

      // Verify all operations succeeded
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });
});
