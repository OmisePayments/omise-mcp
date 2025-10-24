/**
 * MCP Server Type Definitions
 */

export interface ServerConfig {
  omise: {
    publicKey: string;
    secretKey: string;
    environment: 'production' | 'test';
    apiVersion: string;
    baseUrl: string;
    vaultUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  server: {
    name: string;
    version: string;
    description: string;
    port: number;
    host: string;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'simple';
    enableRequestLogging: boolean;
    enableResponseLogging: boolean;
  };
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  tools: {
    allowed: string;
  }
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  metadata?: {
    requestId?: string;
    timestamp?: string;
    duration?: number;
  };
}

export interface PaymentToolParams {
  amount: number;
  currency: string;
  description?: string;
  customer_email?: string;
  card_token?: string;
  capture?: boolean;
}

export interface CustomerToolParams {
  email?: string;
  description?: string;
  card_token?: string;
}

export interface TokenToolParams {
  card_number: string;
  card_name: string;
  expiration_month: number;
  expiration_year: number;
  security_code?: string;
  city?: string;
  postal_code?: string;
}

export interface ServerInfo {
  name: string;
  version: string;
  description: string;
  capabilities: {
    tools: string[];
    resources: string[];
  };
  supportedTools: string[];
  supportedResources: string[];
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

export interface RequestContext {
  requestId: string;
  timestamp: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ResponseContext {
  requestId: string;
  status: number;
  duration: number;
  headers?: Record<string, string>;
  body?: any;
}
