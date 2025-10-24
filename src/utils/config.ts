/**
 * Configuration Management
 */

import dotenv from 'dotenv';
import { ServerConfig } from '../types/mcp.js';

// Load environment variables
dotenv.config();

export function loadConfig(): ServerConfig {
  const requiredEnvVars = [
    'OMISE_PUBLIC_KEY',
    'OMISE_SECRET_KEY',
    'OMISE_ENVIRONMENT',
    'TOOLS'
  ];

  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Additional validation for TOOLS
  const toolsConfig = process.env.TOOLS;
  if (!toolsConfig || toolsConfig.trim() === '') {
      throw new Error(
          'TOOLS environment variable is required. ' +
          'Set TOOLS=all for full access, or specify comma-separated tool names. ' +
          'Example: TOOLS=create_charge,list_charges,create_customer'
      );
  }

  const environment = process.env.OMISE_ENVIRONMENT as 'production' | 'test';
  if (!['production', 'test'].includes(environment)) {
    throw new Error('OMISE_ENVIRONMENT must be either "production" or "test"');
  }

  return {
    omise: {
      publicKey: process.env.OMISE_PUBLIC_KEY!,
      secretKey: process.env.OMISE_SECRET_KEY!,
      environment,
      apiVersion: process.env.OMISE_API_VERSION || '2017-11-02',
      baseUrl: process.env.OMISE_BASE_URL || 'https://api.omise.co',
      vaultUrl: process.env.OMISE_VAULT_URL || 'https://vault.omise.co',
      timeout: parseInt(process.env.OMISE_TIMEOUT || '30000', 10),
      retryAttempts: parseInt(process.env.OMISE_RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.OMISE_RETRY_DELAY || '1000', 10)
    },
    server: {
      name: process.env.SERVER_NAME || 'omise-mcp-server',
      version: process.env.SERVER_VERSION || '1.0.0',
      description: process.env.SERVER_DESCRIPTION || 'MCP Server for Omise Payment Integration',
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || 'localhost'
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      format: (process.env.LOG_FORMAT as any) || 'simple',
      enableRequestLogging: process.env.LOG_REQUESTS === 'true',
      enableResponseLogging: process.env.LOG_RESPONSES === 'true'
    },
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
    },
    tools: {
      allowed: toolsConfig
    }
  };
}

export function validateOmiseKeys(config: ServerConfig): void {
  const { publicKey, secretKey, environment } = config.omise;
  
  // Prevent use of test keys in production environment
  if (environment === 'production') {
    if (publicKey.startsWith('pkey_test_') || secretKey.startsWith('skey_test_')) {
      throw new Error('Test keys cannot be used in production environment');
    }
  }
  
  // Prevent use of production keys in test environment
  if (environment === 'test') {
    if (publicKey.startsWith('pkey_live_') || secretKey.startsWith('skey_live_')) {
      throw new Error('Live keys should not be used in test environment');
    }
  }
}

export function getServerInfo(config: ServerConfig) {
  return {
    name: config.server.name,
    version: config.server.version,
    description: config.server.description,
    capabilities: {
      tools: [
        'create_charge', 'get_charge',
        'create_customer', 'get_customer',
        'create_token', 'get_token',
        'create_transfer', 'get_transfer',
        'create_recipient', 'get_recipient',
        'create_refund', 'get_refund',
        'create_source', 'get_source',
        'create_schedule', 'get_schedule',
        'get_capability'
      ],
      resources: [
        'charge', 'customer', 'card', 'token',
        'transfer', 'recipient', 'transaction',
        'refund', 'dispute', 'event', 'schedule',
        'source', 'capability'
      ]
    },
    supportedTools: [
      'create_charge', 'get_charge',
      'create_customer', 'get_customer',
      'create_token', 'get_token',
      'create_transfer', 'get_transfer',
      'create_recipient', 'get_recipient',
      'create_refund', 'get_refund',
      'create_source', 'get_source',
      'create_schedule', 'get_schedule',
      'get_capability'
    ],
    supportedResources: [
      'charge', 'customer', 'card', 'token',
      'transfer', 'recipient', 'transaction',
      'refund', 'dispute', 'event', 'schedule',
      'source', 'capability'
    ]
  };
}
