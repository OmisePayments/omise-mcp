/**
 * Omise API Client
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { 
  OmiseConfig, 
  OmiseCharge, 
  OmiseCustomer, 
  OmiseToken,
  CreateChargeRequest,
  CreateCustomerRequest,
  CreateTokenRequest,
  OmiseResponse,
  OmiseError,
  OmiseListResponse
} from '../types/omise.js';
import { Logger } from './logger.js';
import { RequestContext, ResponseContext, RateLimitInfo } from '../types/mcp.js';

// Extend Axios types to include custom metadata
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string;
      timestamp: string;
    };
  }
}

export class OmiseClient {
  private client: AxiosInstance;
  private config: OmiseConfig;
  private logger: Logger;
  private rateLimitInfo: RateLimitInfo | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(config: OmiseConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Validate API keys
    this.validateKeys(config);
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      auth: {
        username: config.secretKey,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json',
        'Omise-Version': config.apiVersion,
        'User-Agent': `${config.server?.name || 'omise-mcp-server'}/${config.server?.version || '1.0.0'}`
      }
    });

    this.setupInterceptors();
  }

  private validateKeys(config: OmiseConfig): void {
    const { publicKey, secretKey, environment } = config;

    // Validate public key format (must start with pkey_test_ for test or pkey_ for production)
    const isValidPublicKey = publicKey.startsWith('pkey_test_') || 
                            (publicKey.startsWith('pkey_') && !publicKey.startsWith('pkey_test_'));
    if (!isValidPublicKey) {
      throw new Error('Invalid public key format. Public key must start with "pkey_test_" (test) or "pkey_" (production)');
    }

    // Validate secret key format (must start with skey_test_ for test or skey_ for production)
    const isValidSecretKey = secretKey.startsWith('skey_test_') || 
                            (secretKey.startsWith('skey_') && !secretKey.startsWith('skey_test_'));
    if (!isValidSecretKey) {
      throw new Error('Invalid secret key format. Secret key must start with "skey_test_" (test) or "skey_" (production)');
    }

    // Prevent use of production keys in test environment
    // Production keys start with pkey_/skey_ but NOT pkey_test_/skey_test_
    // In production environment, both test keys and live keys are allowed
    // (test keys for test charges, live keys for live charges)
    if (environment === 'test') {
      const isProductionPublicKey = publicKey.startsWith('pkey_') && !publicKey.startsWith('pkey_test_');
      const isProductionSecretKey = secretKey.startsWith('skey_') && !secretKey.startsWith('skey_test_');
      if (isProductionPublicKey || isProductionSecretKey) {
        throw new Error('Live keys should not be used in test environment');
      }
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const requestId = this.generateRequestId();
        const timestamp = new Date().toISOString();
        
        if (this.config.logging?.enableRequestLogging) {
          this.logger.info('Omise API Request', {
            requestId,
            method: config.method?.toUpperCase(),
            url: config.url,
            headers: config.headers,
            data: config.data
          });
        }

        // Set request context
        config.metadata = { requestId, timestamp };
        
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error as Error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const requestId = response.config.metadata?.requestId;
        const timestamp = response.config.metadata?.timestamp;
        const duration = timestamp ? Date.now() - new Date(timestamp).getTime() : 0;

        if (this.config.logging?.enableResponseLogging) {
          this.logger.info('Omise API Response', {
            requestId,
            status: response.status,
            duration,
            headers: response.headers,
            data: response.data
          });
        }

        // Update rate limit information
        this.updateRateLimitInfo(response.headers);

        return response;
      },
      (error: AxiosError) => {
        const requestId = error.config?.metadata?.requestId;
        const timestamp = error.config?.metadata?.timestamp;
        const duration = timestamp ? Date.now() - new Date(timestamp).getTime() : 0;

        this.logger.error('Omise API Error', error as Error, {
          requestId,
          status: error.response?.status,
          duration,
          data: error.response?.data,
          headers: error.response?.headers
        });

        // Handle rate limit errors
        if (error.response?.status === 429) {
          this.handleRateLimitError(error);
        }

        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateRateLimitInfo(headers: any): void {
    const remaining = headers['x-ratelimit-remaining'];
    const resetTime = headers['x-ratelimit-reset'];
    const limit = headers['x-ratelimit-limit'];

    if (remaining !== undefined && resetTime !== undefined && limit !== undefined) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining, 10),
        resetTime: parseInt(resetTime, 10),
        limit: parseInt(limit, 10)
      };
    }
  }

  private handleRateLimitError(error: AxiosError): void {
    const retryAfter = error.response?.headers['retry-after'];
    if (retryAfter) {
      const delay = parseInt(retryAfter, 10) * 1000;
      this.logger.warn(`Rate limit exceeded. Retrying after ${delay}ms`);
      
      // Add to retry queue
      setTimeout(() => {
        this.processQueue();
      }, delay);
    }
  }

  private handleApiError(error: AxiosError): Error {
    if (error.response?.data) {
      const omiseError = error.response.data as OmiseError;
      return new Error(`Omise API Error: ${omiseError.message} (${omiseError.code})`);
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout');
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Network error: Unable to connect to Omise API');
    }
    
    return new Error(`Request failed: ${error.message}`);
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Do not retry rate limit errors or client errors
        if (error instanceof AxiosError && error.response?.status && error.response.status < 500) {
          throw error;
        }
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error: lastError.message });
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const operation = this.requestQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          this.logger.error('Queue operation failed', error as Error);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  public getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  // ============================================================================
  // Charge API
  // ============================================================================

  async createCharge(params: CreateChargeRequest): Promise<OmiseCharge> {
    return this.executeWithRetry(async () => {
      this.logger.info('Creating charge', { amount: params.amount, currency: params.currency });
      
      const response = await this.client.post<OmiseCharge>('/charges', params);
      
      // Charge API returns the charge directly, not wrapped in OmiseResponse
      if (!response.data || !response.data.id) {
        throw new Error(`Omise API Error: Invalid charge response`);
      }

      this.logger.info('Charge created successfully', { chargeId: response.data.id });
      return response.data;
    });
  }

  async getCharge(chargeId: string): Promise<OmiseCharge> {
    return this.executeWithRetry(async () => {
      this.logger.info('Retrieving charge', { chargeId });
      
      const response = await this.client.get<OmiseCharge>(`/charges/${chargeId}`);
      
      // Charge API returns the charge directly, not wrapped in OmiseResponse
      if (!response.data || !response.data.id) {
        throw new Error(`Omise API Error: Invalid charge response`);
      }

      return response.data;
    });
  }

  async listCharges(params?: any): Promise<OmiseListResponse<OmiseCharge>> {
    return this.executeWithRetry(async () => {
      this.logger.info('Listing charges', params);
      
      const response = await this.client.get<OmiseListResponse<OmiseCharge>>('/charges', { params });
      
      return response.data;
    });
  }

  // ============================================================================
  // Customer API
  // ============================================================================

  async createCustomer(params: CreateCustomerRequest): Promise<OmiseCustomer> {
    return this.executeWithRetry(async () => {
      this.logger.info('Creating customer', { email: params.email });
      
      const response = await this.client.post<OmiseCustomer>('/customers', params);
      
      // Customer API returns the customer directly, not wrapped in OmiseResponse
      if (!response.data || !response.data.id) {
        throw new Error(`Omise API Error: Invalid customer response`);
      }

      this.logger.info('Customer created successfully', { customerId: response.data.id });
      return response.data;
    });
  }

  async getCustomer(customerId: string): Promise<OmiseCustomer> {
    return this.executeWithRetry(async () => {
      this.logger.info('Retrieving customer', { customerId });
      
      const response = await this.client.get<OmiseCustomer>(`/customers/${customerId}`);
      
      // Customer API returns the customer directly, not wrapped in OmiseResponse
      if (!response.data || !response.data.id) {
        throw new Error(`Omise API Error: Invalid customer response`);
      }

      return response.data;
    });
  }

  async listCustomers(params?: any): Promise<OmiseListResponse<OmiseCustomer>> {
    return this.executeWithRetry(async () => {
      this.logger.info('Listing customers', params);
      
      const response = await this.client.get<OmiseListResponse<OmiseCustomer>>('/customers', { params });
      
      return response.data;
    });
  }

  // ============================================================================
  // Token API
  // ============================================================================

  async createToken(params: CreateTokenRequest): Promise<OmiseToken> {
    return this.executeWithRetry(async () => {
      this.logger.info('Creating token', { cardNumber: params.card.number.replace(/\d(?=\d{4})/g, '*') });
      
      // Token creation must use vault.omise.co domain, not api.omise.co
      // AND must use public key for authentication, not secret key
      const fullUrl = `${this.config.vaultUrl}/tokens`;
      this.logger.info('Using vault URL for token creation', { vaultUrl: fullUrl });
      
      const response = await this.client.post<OmiseToken>(fullUrl, params, {
        auth: {
          username: this.config.publicKey,  // Use public key for token creation
          password: ''
        }
      });
      
      // Token API returns the token directly, not wrapped in OmiseResponse
      if (!response.data || !response.data.id) {
        throw new Error(`Omise API Error: Invalid token response`);
      }

      this.logger.info('Token created successfully', { tokenId: response.data.id });
      return response.data;
    });
  }

  async getToken(tokenId: string): Promise<OmiseToken> {
    return this.executeWithRetry(async () => {
      this.logger.info('Retrieving token', { tokenId });
      
      // Token retrieval must also use vault.omise.co domain
      const fullUrl = `${this.config.vaultUrl}/tokens/${tokenId}`;
      const response = await this.client.get<OmiseToken>(fullUrl, {
        auth: {
          username: this.config.publicKey,  // Use public key for token operations
          password: ''
        }
      });
      
      // Token API returns the token directly, not wrapped in OmiseResponse
      if (!response.data || !response.data.id) {
        throw new Error(`Omise API Error: Invalid token response`);
      }

      return response.data;
    });
  }

  // ============================================================================
  // Generic API methods
  // ============================================================================

  async get<T>(endpoint: string, params?: any): Promise<T> {
    return this.executeWithRetry(async () => {
      this.logger.info('GET request', { endpoint, params });
      
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.executeWithRetry(async () => {
      this.logger.info('POST request', { endpoint, data });
      
      const response = await this.client.post<T>(endpoint, data);
      return response.data;
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.executeWithRetry(async () => {
      this.logger.info('PUT request', { endpoint, data });
      
      const response = await this.client.put<T>(endpoint, data);
      return response.data;
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.executeWithRetry(async () => {
      this.logger.info('DELETE request', { endpoint });
      
      const response = await this.client.delete<T>(endpoint);
      return response.data;
    });
  }
}
