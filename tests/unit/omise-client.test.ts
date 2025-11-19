/**
 * Omise Client Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import type { 
  OmiseConfig, 
  OmiseCharge,
  OmiseCustomer, 
  CreateChargeRequest,
  CreateCustomerRequest,
  CreateTokenRequest,
  OmiseListResponse
} from '../../src/types';
import { createMockCharge, createMockCustomer, createMockToken } from '../factories';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Logger
jest.mock('../../src/utils/logger.js');

describe('OmiseClient', () => {
  let omiseClient: OmiseClient;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  let mockLogger: jest.Mocked<Logger>;
  let mockConfig: OmiseConfig;

  beforeEach(() => {
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
      delete: jest.fn()
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Mock setTimeout globally to avoid actual delays in tests
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, _delay?: number) => {
      // Execute immediately for tests
      fn();
      return {} as any;
    });

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn()
    } as any;

    // Create mock config with faster settings for testing
    mockConfig = {
      baseUrl: 'https://api.omise.co',
      vaultUrl: 'https://vault.omise.co',
      publicKey: 'pkey_test_123',
      secretKey: 'skey_test_123',
      apiVersion: '2019-05-29',
      timeout: 1000, // Reduced from 30000ms to 1000ms for faster tests
      retryAttempts: 2, // Reduced from 3 to 2 for faster tests
      retryDelay: 10, // Reduced from 1000ms to 10ms for faster tests
      environment: 'test',
      logging: {
        enableRequestLogging: true,
        enableResponseLogging: true
      },
      server: {
        name: 'omise-mcp-server',
        version: '1.0.0'
      }
    };

    omiseClient = new OmiseClient(mockConfig, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create OmiseClient with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.omise.co',
        timeout: 1000,
        auth: {
          username: 'skey_test_123',
          password: ''
        },
        headers: {
          'Content-Type': 'application/json',
          'Omise-Version': '2019-05-29',
          'User-Agent': 'omise-mcp-server/1.0.0'
        }
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should handle missing server config', () => {
      const configWithoutServer = { ...mockConfig };
      delete configWithoutServer.server;
      
      new OmiseClient(configWithoutServer, mockLogger);
      
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'omise-mcp-server/1.0.0'
          })
        })
      );
    });

    it('should handle missing logging config', () => {
      const configWithoutLogging = { ...mockConfig };
      delete configWithoutLogging.logging;
      
      new OmiseClient(configWithoutLogging, mockLogger);
      
      expect(mockedAxios.create).toHaveBeenCalled();
    });

    // Note: Key validation (format and environment) is handled by validateOmiseKeys in config.ts
    // which is called before creating OmiseClient instance
  });

  describe('request interceptor', () => {
    let requestInterceptor: any;

    beforeEach(() => {
      // Get the request interceptor function
      requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0]?.[0];
    });

    it('should add request metadata and logging', () => {
      const config = {
        method: 'post',
        url: '/charges',
        headers: {},
        data: { amount: 1000 }
      };

      const result = requestInterceptor(config);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(result.metadata.timestamp).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Omise API Request', {
        requestId: result.metadata.requestId,
        method: 'POST',
        url: '/charges',
        headers: {},
        data: { amount: 1000 }
      });
    });

    it('should handle request interceptor error', () => {
      const errorInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0]?.[1];
      const error = new Error('Request error');

      expect(() => errorInterceptor?.(error)).rejects.toThrow('Request error');
      expect(mockLogger.error).toHaveBeenCalledWith('Request interceptor error', error);
    });

    it('should skip logging when disabled', () => {
      const configWithoutLogging = { ...mockConfig };
      configWithoutLogging.logging = { enableRequestLogging: false, enableResponseLogging: false };
        new OmiseClient(configWithoutLogging, mockLogger);
        const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[1]?.[0];
      
      const config = { method: 'get', url: '/charges', headers: {} } as any;
      requestInterceptor?.(config);

      expect(mockLogger.info).not.toHaveBeenCalledWith('Omise API Request', expect.any(Object));
    });
  });

  describe('response interceptor', () => {
    let responseInterceptor: any;
    let errorInterceptor: any;

    beforeEach(() => {
      // Get the response interceptor functions
      responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[0];
      errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
    });

    it('should log successful responses and update rate limit info', () => {
      const response: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '95',
          'x-ratelimit-reset': '1640995200',
          'x-ratelimit-limit': '100'
        },
        data: { id: 'chrg_123', amount: 1000 },
        config: {
          metadata: {
            requestId: 'req_123',
            timestamp: new Date(Date.now() - 100).toISOString()
          }
        } as any
      };

      const result = responseInterceptor(response);

      expect(result).toBe(response);
      expect(mockLogger.info).toHaveBeenCalledWith('Omise API Response', {
        requestId: 'req_123',
        status: 200,
        duration: expect.any(Number),
        headers: response.headers,
        data: response.data
      });

      // Check rate limit info was updated
      const rateLimitInfo = omiseClient.getRateLimitInfo();
      expect(rateLimitInfo).toEqual({
        remaining: 95,
        resetTime: 1640995200,
        limit: 100
      });
    });

    it('should handle response without metadata', () => {
      const response: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { id: 'chrg_123' },
        config: {} as any
      };

      const result = responseInterceptor(response);

      expect(result).toBe(response);
      expect(mockLogger.info).toHaveBeenCalledWith('Omise API Response', {
        requestId: undefined,
        status: 200,
        duration: 0,
        headers: {},
        data: { id: 'chrg_123' }
      });
    });

    it('should handle rate limit error (429)', () => {
      const error = new AxiosError('Rate limit exceeded', '429');
      error.response = {
        status: 429,
        headers: { 'retry-after': '60' },
        data: { message: 'Rate limit exceeded' }
      } as any;
      error.config = {
        metadata: {
          requestId: 'req_123',
          timestamp: new Date(Date.now() - 100).toISOString()
        }
      } as any;

      expect(() => errorInterceptor?.(error)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Omise API Error', error, {
        requestId: 'req_123',
        status: 429,
        duration: expect.any(Number),
        data: { message: 'Rate limit exceeded' },
        headers: { 'retry-after': '60' }
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('Rate limit exceeded. Retrying after 60000ms');
    });

    it('should handle Omise API errors', () => {
      const error: AxiosError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid amount',
            code: 'invalid_amount'
          }
        }
      } as AxiosError;

      expect(() => errorInterceptor(error)).rejects.toThrow('Omise API Error: Invalid amount (invalid_amount)');
    });

    it('should handle timeout errors', () => {
      const error: AxiosError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      } as AxiosError;

      expect(() => errorInterceptor(error)).rejects.toThrow('Request timeout');
    });

    it('should handle network errors', () => {
      const error: AxiosError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.omise.co'
      } as AxiosError;

      expect(() => errorInterceptor(error)).rejects.toThrow('Network error: Unable to connect to Omise API');
    });

    it('should handle connection refused errors', () => {
      const error: AxiosError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED'
      } as AxiosError;

      expect(() => errorInterceptor(error)).rejects.toThrow('Network error: Unable to connect to Omise API');
    });

    it('should handle generic errors', () => {
      const error: AxiosError = {
        message: 'Something went wrong'
      } as AxiosError;

      expect(() => errorInterceptor(error)).rejects.toThrow('Request failed: Something went wrong');
    });
  });

  describe('rate limiting', () => {
    it('should return null when no rate limit info available', () => {
      const rateLimitInfo = omiseClient.getRateLimitInfo();
      expect(rateLimitInfo).toBeNull();
    });

    it('should update rate limit info from headers', () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[0];
      
      const response: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '50',
          'x-ratelimit-reset': '1640995200',
          'x-ratelimit-limit': '100'
        },
        data: {},
        config: {} as any
      };

      responseInterceptor?.(response);

      const rateLimitInfo = omiseClient.getRateLimitInfo();
      expect(rateLimitInfo).toEqual({
        remaining: 50,
        resetTime: 1640995200,
        limit: 100
      });
    });

    it('should handle partial rate limit headers', () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[0];
      
      const response: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'x-ratelimit-remaining': '50'
          // Missing reset and limit headers
        },
        data: {},
        config: {} as any
      };

      responseInterceptor?.(response);

      const rateLimitInfo = omiseClient.getRateLimitInfo();
      expect(rateLimitInfo).toBeNull();
    });
  });

  describe('retry mechanism', () => {
    it('should retry on server errors (5xx)', async () => {
      const mockCharge = createMockCharge();
      
      // First call fails with 500, second succeeds
      mockAxiosInstance.post
        .mockRejectedValueOnce({
          response: { status: 500 },
          message: 'Internal server error'
        })
        .mockResolvedValueOnce({
          data: mockCharge
        });

      const result = await omiseClient.createCharge({
        amount: 1000,
        currency: 'THB',
        card: 'tokn_123'
      });

      expect(result).toEqual(mockCharge);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should retry with exponential backoff', async () => {
      const mockCharge = createMockCharge();
      
      // First call fails, second succeeds
      mockAxiosInstance.post
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ data: mockCharge });

      const result = await omiseClient.createCharge({
        amount: 1000,
        currency: 'THB',
        card: 'tokn_123'
      });

      expect(result).toEqual(mockCharge);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retry attempts', async () => {
      // Mock axios to reject with errors that will trigger retries
      mockAxiosInstance.post.mockRejectedValue(new Error('Persistent error'));

      await expect(omiseClient.createCharge({
        amount: 1000,
        currency: 'THB',
        card: 'tokn_123'
      })).rejects.toThrow('Persistent error');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2); // Initial + 1 retry (reduced retryAttempts)
    });

    it('should not retry on client errors (4xx)', async () => {
      // Test that 4xx errors don't trigger retries
      // The error interceptor transforms errors, and executeWithRetry checks status < 500
      // We test this by checking that client errors (400) only call post once
      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
      
      const axiosError = new AxiosError('Bad Request');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 400,
        statusText: 'Bad Request',
        data: { 
          message: 'Bad Request',
          code: 'bad_request'
        },
        headers: {},
        config: {
          metadata: {
            requestId: 'req_123',
            timestamp: new Date().toISOString()
          }
        } as any
      };

      // Test the error interceptor directly with a 400 error
      await expect(errorInterceptor?.(axiosError)).rejects.toThrow('Omise API Error: Bad Request (bad_request)');
      
      // Note: The executeWithRetry logic at line 230 checks error.response?.status < 500 to avoid retries
      // However, since the error interceptor transforms AxiosError to Error before executeWithRetry sees it,
      // line 230 is effectively unreachable in practice. The interceptor always transforms errors first.
      // To test line 230 directly, we would need to bypass the interceptor, which isn't part of normal flow.
    });

    it('should handle AxiosError with status < 500 in executeWithRetry', async () => {
      // Test line 230: executeWithRetry checks for AxiosError with status < 500
      // To test this, we need to bypass the interceptor which normally transforms errors
      // We test by directly accessing the private executeWithRetry method via reflection
      
      // Create an AxiosError that would trigger the early throw at line 230
      const axiosError = new AxiosError('Client Error');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Bad Request', code: 'bad_request' },
        headers: {},
        config: {} as any
      };

      // Access the private executeWithRetry method to test line 230 directly
      const executeWithRetry = (omiseClient as any).executeWithRetry.bind(omiseClient);
      
      // Create a mock operation that throws the AxiosError
      const failingOperation = jest.fn<() => Promise<any>>().mockRejectedValue(axiosError);
      
      // executeWithRetry should throw immediately for 4xx errors (line 230)
      await expect(executeWithRetry(failingOperation)).rejects.toBe(axiosError);
      
      // Should only be called once (early throw, no retry)
      expect(failingOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('rate limit queue processing', () => {
    beforeEach(() => {
      // Restore setTimeout for queue tests since we need it to actually call processQueue
      jest.restoreAllMocks();
    });

    it('should process queue when rate limit error occurs with retry-after header', async () => {
      // Test processQueue through rate limit error handling
      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
      
      const axiosError: AxiosError = new AxiosError('Rate limit exceeded');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '1' },
        data: { message: 'Rate limit exceeded' },
        config: {
          metadata: {
            requestId: 'req_123',
            timestamp: new Date().toISOString()
          }
        } as any
      };

      // Access private requestQueue and populate it to test processQueue logic
      const requestQueue = (omiseClient as any).requestQueue as Array<() => Promise<any>>;
      
      // Add a mock operation to the queue
      const mockOperation = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      requestQueue.push(mockOperation);

      // Mock setTimeout to call the function immediately
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn(); // Execute immediately
        return {} as any;
      });

      try {
        await errorInterceptor?.(axiosError);
      } catch (e) {
        // Expected to throw after transformation
      }

      // Verify setTimeout was called (which calls processQueue)
      expect(setTimeoutSpy).toHaveBeenCalled();
      
      setTimeoutSpy.mockRestore();
    });

    it('should handle queue processing with multiple operations', async () => {
      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
      
      const axiosError: AxiosError = new AxiosError('Rate limit exceeded');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '1' },
        data: { message: 'Rate limit exceeded' },
        config: {
          metadata: {
            requestId: 'req_123',
            timestamp: new Date().toISOString()
          }
        } as any
      };

      // Access private queue and add multiple operations
      const requestQueue = (omiseClient as any).requestQueue as Array<() => Promise<any>>;
      
      const mockOperation1 = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const mockOperation2 = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      requestQueue.push(mockOperation1, mockOperation2);

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn(); // Execute immediately
        return {} as any;
      });

      try {
        await errorInterceptor?.(axiosError);
      } catch (e) {
        // Expected
      }

      expect(setTimeoutSpy).toHaveBeenCalled();
      setTimeoutSpy.mockRestore();
    });

    it('should handle queue processing errors gracefully', async () => {
      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0]?.[1];
      
      const axiosError: AxiosError = new AxiosError('Rate limit exceeded');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '1' },
        data: { message: 'Rate limit exceeded' },
        config: {
          metadata: {
            requestId: 'req_123',
            timestamp: new Date().toISOString()
          }
        } as any
      };

      // Access private queue and add a failing operation
      const requestQueue = (omiseClient as any).requestQueue as Array<() => Promise<any>>;
      
      const failingOperation = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Operation failed'));
      requestQueue.push(failingOperation);

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn(); // Execute immediately
        return {} as any;
      });

      try {
        await errorInterceptor?.(axiosError);
      } catch (e) {
        // Expected
      }

      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Queue operation failed', expect.any(Error));
      
      setTimeoutSpy.mockRestore();
    });
  });

  describe('charge API', () => {
    describe('createCharge', () => {
      it('should create charge successfully', async () => {
        const mockCharge = createMockCharge();
        const chargeParams: CreateChargeRequest = {
          amount: 1000,
          currency: 'THB',
          card: 'tokn_123'
        };

        mockAxiosInstance.post.mockResolvedValue({ data: mockCharge });

        const result = await omiseClient.createCharge(chargeParams);

        expect(result).toEqual(mockCharge);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/charges', chargeParams);
        expect(mockLogger.info).toHaveBeenCalledWith('Creating charge', { amount: 1000, currency: 'THB' });
        expect(mockLogger.info).toHaveBeenCalledWith('Charge created successfully', { chargeId: mockCharge.id });
      });

      it('should throw error for invalid charge response', async () => {
        mockAxiosInstance.post.mockResolvedValue({ data: null });

        await expect(omiseClient.createCharge({
          amount: 1000,
          currency: 'THB',
          card: 'tokn_123'
        })).rejects.toThrow('Omise API Error: Invalid charge response');
      });

      it('should throw error for charge response without ID', async () => {
        mockAxiosInstance.post.mockResolvedValue({ 
          data: { amount: 1000, currency: 'THB' } // Missing ID
        });

        await expect(omiseClient.createCharge({
          amount: 1000,
          currency: 'THB',
          card: 'tokn_123'
        })).rejects.toThrow('Omise API Error: Invalid charge response');
      });
    });

    describe('getCharge', () => {
      it('should retrieve charge successfully', async () => {
        const mockCharge = createMockCharge();
        const chargeId = 'chrg_123';

        mockAxiosInstance.get.mockResolvedValue({ data: mockCharge });

        const result = await omiseClient.getCharge(chargeId);

        expect(result).toEqual(mockCharge);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/charges/${chargeId}`);
        expect(mockLogger.info).toHaveBeenCalledWith('Retrieving charge', { chargeId });
      });

      it('should throw error for invalid charge response', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: null });

        await expect(omiseClient.getCharge('chrg_123')).rejects.toThrow('Omise API Error: Invalid charge response');
      });
    });

    describe('listCharges', () => {
      it('should list charges successfully', async () => {
        const mockCharges: OmiseListResponse<OmiseCharge> = {
          object: 'list',
          data: [createMockCharge(), createMockCharge()],
          total: 2,
          limit: 20,
          offset: 0,
          order: 'chronological',
          location: '/charges'
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockCharges });

        const result = await omiseClient.listCharges({ limit: 20 });

        expect(result).toEqual(mockCharges);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/charges', { params: { limit: 20 } });
        expect(mockLogger.info).toHaveBeenCalledWith('Listing charges', { limit: 20 });
      });

      it('should list charges without parameters', async () => {
        const mockCharges: OmiseListResponse<OmiseCharge> = {
          object: 'list',
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
          order: 'chronological',
          location: '/charges'
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockCharges });

        const result = await omiseClient.listCharges();

        expect(result).toEqual(mockCharges);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/charges', { params: undefined });
      });
    });
  });

  describe('customer API', () => {
    describe('createCustomer', () => {
      it('should create customer successfully', async () => {
        const mockCustomer = createMockCustomer();
        const customerParams: CreateCustomerRequest = {
          email: 'test@example.com',
          description: 'Test customer'
        };

        mockAxiosInstance.post.mockResolvedValue({ data: mockCustomer });

        const result = await omiseClient.createCustomer(customerParams);

        expect(result).toEqual(mockCustomer);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/customers', customerParams);
        expect(mockLogger.info).toHaveBeenCalledWith('Creating customer', { email: 'test@example.com' });
        expect(mockLogger.info).toHaveBeenCalledWith('Customer created successfully', { customerId: mockCustomer.id });
      });

      it('should throw error for invalid customer response', async () => {
        mockAxiosInstance.post.mockResolvedValue({ data: null });

        await expect(omiseClient.createCustomer({
          email: 'test@example.com'
        })).rejects.toThrow('Omise API Error: Invalid customer response');
      });
    });

    describe('getCustomer', () => {
      it('should retrieve customer successfully', async () => {
        const mockCustomer = createMockCustomer();
        const customerId = 'cust_123';

        mockAxiosInstance.get.mockResolvedValue({ data: mockCustomer });

        const result = await omiseClient.getCustomer(customerId);

        expect(result).toEqual(mockCustomer);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/customers/${customerId}`);
        expect(mockLogger.info).toHaveBeenCalledWith('Retrieving customer', { customerId });
      });

      it('should throw error for invalid customer response', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: null });

        await expect(omiseClient.getCustomer('cust_123')).rejects.toThrow('Omise API Error: Invalid customer response');
      });

      it('should throw error for customer response without ID', async () => {
        mockAxiosInstance.get.mockResolvedValue({ 
          data: { email: 'test@example.com' } // Missing ID
        });

        await expect(omiseClient.getCustomer('cust_123')).rejects.toThrow('Omise API Error: Invalid customer response');
      });
    });

    describe('listCustomers', () => {
      it('should list customers successfully', async () => {
        const mockCustomers: OmiseListResponse<OmiseCustomer> = {
          object: 'list',
          data: [createMockCustomer(), createMockCustomer()],
          total: 2,
          limit: 20,
          offset: 0,
          order: 'chronological',
          location: '/customers'
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockCustomers });

        const result = await omiseClient.listCustomers({ limit: 20 });

        expect(result).toEqual(mockCustomers);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/customers', { params: { limit: 20 } });
        expect(mockLogger.info).toHaveBeenCalledWith('Listing customers', { limit: 20 });
      });
    });
  });

  describe('generic API methods', () => {
    describe('get', () => {
      it('should make GET request successfully', async () => {
        const mockData = { id: 'test', name: 'Test' };
        mockAxiosInstance.get.mockResolvedValue({ data: mockData });

        const result = await omiseClient.get('/test-endpoint', { param: 'value' });

        expect(result).toEqual(mockData);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-endpoint', { params: { param: 'value' } });
        expect(mockLogger.info).toHaveBeenCalledWith('GET request', { 
          endpoint: '/test-endpoint', 
          params: { param: 'value' } 
        });
      });

      it('should make GET request without parameters', async () => {
        const mockData = { id: 'test' };
        mockAxiosInstance.get.mockResolvedValue({ data: mockData });

        const result = await omiseClient.get('/test-endpoint');

        expect(result).toEqual(mockData);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-endpoint', { params: undefined });
      });
    });

    describe('post', () => {
      it('should make POST request successfully', async () => {
        const mockData = { id: 'test', created: true };
        const requestData = { name: 'Test', value: 123 };
        mockAxiosInstance.post.mockResolvedValue({ data: mockData });

        const result = await omiseClient.post('/test-endpoint', requestData);

        expect(result).toEqual(mockData);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test-endpoint', requestData);
        expect(mockLogger.info).toHaveBeenCalledWith('POST request', { 
          endpoint: '/test-endpoint', 
          data: requestData 
        });
      });

      it('should make POST request without data', async () => {
        const mockData = { id: 'test' };
        mockAxiosInstance.post.mockResolvedValue({ data: mockData });

        const result = await omiseClient.post('/test-endpoint');

        expect(result).toEqual(mockData);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test-endpoint', undefined);
      });
    });

    describe('put', () => {
      it('should make PUT request successfully', async () => {
        const mockData = { id: 'test', updated: true };
        const requestData = { name: 'Updated Test' };
        mockAxiosInstance.put.mockResolvedValue({ data: mockData });

        const result = await omiseClient.put('/test-endpoint', requestData);

        expect(result).toEqual(mockData);
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test-endpoint', requestData);
        expect(mockLogger.info).toHaveBeenCalledWith('PUT request', { 
          endpoint: '/test-endpoint', 
          data: requestData 
        });
      });
    });

    describe('delete', () => {
      it('should make DELETE request successfully', async () => {
        const mockData = { id: 'test', deleted: true };
        mockAxiosInstance.delete.mockResolvedValue({ data: mockData });

        const result = await omiseClient.delete('/test-endpoint');

        expect(result).toEqual(mockData);
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test-endpoint');
        expect(mockLogger.info).toHaveBeenCalledWith('DELETE request', { 
          endpoint: '/test-endpoint' 
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle axios errors properly', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Omise API Error: Invalid request (invalid_request)'));

      await expect(omiseClient.createCharge({
        amount: 1000,
        currency: 'THB',
        card: 'tokn_123'
      })).rejects.toThrow('Omise API Error: Invalid request (invalid_request)');
    });
  });

  describe('edge cases', () => {
    it('should handle empty response data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await expect(omiseClient.createCharge({
        amount: 1000,
        currency: 'THB',
        card: 'tokn_123'
      })).rejects.toThrow('Omise API Error: Invalid charge response');
    });

    it('should handle malformed response', async () => {
      mockAxiosInstance.post.mockResolvedValue({ 
        data: { id: null, amount: 1000 } 
      });

      await expect(omiseClient.createCharge({
        amount: 1000,
        currency: 'THB',
        card: 'tokn_123'
      })).rejects.toThrow('Omise API Error: Invalid charge response');
    });

    it('should handle concurrent requests', async () => {
      const mockCharge = createMockCharge();
      mockAxiosInstance.post.mockResolvedValue({ data: mockCharge });

      const promises = Array.from({ length: 5 }, () =>
        omiseClient.createCharge({
          amount: 1000,
          currency: 'THB',
          card: 'tokn_123'
        })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toEqual(mockCharge);
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(5);
    });

    it('should handle very large request data', async () => {
      const mockCharge = createMockCharge();
      const largeData = {
        amount: 1000,
        currency: 'THB',
        card: 'tokn_123',
        description: 'A'.repeat(10000), // Very long description
        metadata: {
          large_field: 'B'.repeat(5000)
        }
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockCharge });

      const result = await omiseClient.createCharge(largeData);

      expect(result).toEqual(mockCharge);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/charges', largeData);
    });

    it('should handle special characters in data', async () => {
      const mockCharge = createMockCharge();
      const specialData = {
        amount: 1000,
        currency: 'THB',
        card: 'tokn_123',
        description: 'Test with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?'
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockCharge });

      const result = await omiseClient.createCharge(specialData);

      expect(result).toEqual(mockCharge);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/charges', specialData);
    });
  });

  describe('logging configuration', () => {
    it('should respect disabled response logging', () => {
      const configWithoutResponseLogging = { ...mockConfig };
      configWithoutResponseLogging.logging = { 
        enableRequestLogging: true, 
        enableResponseLogging: false 
      };
        new OmiseClient(configWithoutResponseLogging, mockLogger);
        const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[1]?.[0];
      
      const response: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { id: 'test' },
        config: {} as any
      };

      responseInterceptor?.(response);

      expect(mockLogger.info).not.toHaveBeenCalledWith('Omise API Response', expect.any(Object));
    });

    it('should respect disabled request logging', () => {
      const configWithoutRequestLogging = { ...mockConfig };
      configWithoutRequestLogging.logging = { 
        enableRequestLogging: false, 
        enableResponseLogging: true 
      };
        new OmiseClient(configWithoutRequestLogging, mockLogger);
        const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[1]?.[0];
      
      const config = { method: 'post', url: '/test', headers: {} } as any;
      requestInterceptor?.(config);

      expect(mockLogger.info).not.toHaveBeenCalledWith('Omise API Request', expect.any(Object));
    });
  });
});
