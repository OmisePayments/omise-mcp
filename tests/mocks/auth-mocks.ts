/**
 * Authentication Test Mocks
 */

import { jest } from '@jest/globals';
import { Logger } from '../../src/utils';
import { 
  OAuth2Provider,
  MutualTLSProvider,
  A2ACommunication,
  A2AAuthService
} from '../../src/auth';
import { 
  AgentIdentity, 
  TokenResponse, 
  AgentCertificate,
  A2AResponse,
  HealthCheckResult,
  SecurityMetrics
} from '../../src/types/auth';

// Mock Logger
export const createMockLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
} as any);

// Mock OAuth2Provider
export const createMockOAuth2Provider = (): jest.Mocked<OAuth2Provider> => ({
  registerClient: jest.fn(),
  generateAuthorizationUrl: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  validateToken: jest.fn(),
  revokeToken: jest.fn()
} as any);

// Mock MutualTLSProvider
export const createMockMutualTLSProvider = (): jest.Mocked<MutualTLSProvider> => ({
  issueAgentCertificate: jest.fn(),
  validateAgentCertificate: jest.fn(),
  createTLSContext: jest.fn(),
  revokeAgentCertificate: jest.fn(),
  getCertificateStatus: jest.fn(),
  listCertificates: jest.fn()
} as any);

// Mock A2ACommunication
export const createMockA2ACommunication = (): jest.Mocked<A2ACommunication> => ({
  initializeConnection: jest.fn(),
  sendMessage: jest.fn(),
  receiveMessage: jest.fn(),
  closeConnection: jest.fn(),
  getConnectionStatus: jest.fn(),
  listConnections: jest.fn()
} as any);

// Mock A2AAuthService
export const createMockA2AAuthService = (): jest.Mocked<A2AAuthService> => ({
  registerAgent: jest.fn(),
  authenticateAgent: jest.fn(),
  establishSecureChannel: jest.fn(),
  sendSecureMessage: jest.fn(),
  performHealthCheck: jest.fn(),
  getSecurityMetrics: jest.fn()
} as any);

// Mock responses
export const mockTokenResponse: TokenResponse = {
  access_token: 'mock-access-token-123',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token-123',
  scope: 'read write'
};

export const mockAgentCertificate: AgentCertificate = {
  agentId: 'test-agent-001',
  privateKey: Buffer.from('-----BEGIN PRIVATE KEY-----\nmock-private-key\n-----END PRIVATE KEY-----'),
  certificate: '-----BEGIN CERTIFICATE-----\nmock-certificate-content\n-----END CERTIFICATE-----',
  caCertificate: Buffer.from('-----BEGIN CERTIFICATE-----\nmock-ca-certificate\n-----END CERTIFICATE-----'),
  issuedAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  serialNumber: '001'
};

export const mockA2AResponse: A2AResponse = {
  success: true,
  messageId: 'msg_response_001',
  payload: { status: 'success', processedAt: new Date() },
  timestamp: new Date()
};

export const mockHealthCheckResult: HealthCheckResult = {
  service: 'test-agent-001',
  status: 'healthy',
  responseTime: 50,
  lastCheck: new Date(),
  details: { uptime: 3600, version: '1.0.0' }
};

export const mockSecurityMetrics: SecurityMetrics = {
  totalRequests: 1000,
  successfulRequests: 950,
  failedRequests: 50,
  blockedRequests: 10,
  averageResponseTime: 150,
  topErrorCodes: [
    { code: 401, count: 20 },
    { code: 403, count: 15 },
    { code: 500, count: 10 }
  ],
  topAgents: [
    { agentId: 'agent-001', requestCount: 500 },
    { agentId: 'agent-002', requestCount: 300 },
    { agentId: 'agent-003', requestCount: 200 }
  ],
  securityEvents: [
    { type: 'authentication_success', count: 800, lastOccurrence: new Date() },
    { type: 'authentication_failed', count: 50, lastOccurrence: new Date() }
  ]
};

export const mockAgentIdentity: AgentIdentity = {
  clientId: 'test-client-001',
  name: 'Test Agent',
  scopes: ['read', 'write'],
  issuedAt: new Date(),
  expiresAt: new Date(Date.now() + 3600 * 1000)
};

// Mock successful responses
export const mockSuccessfulResponses = {
  tokenResponse: mockTokenResponse,
  agentCertificate: mockAgentCertificate,
  a2aResponse: mockA2AResponse,
  healthCheckResult: mockHealthCheckResult,
  securityMetrics: mockSecurityMetrics,
  agentIdentity: mockAgentIdentity
};

// Mock error responses
export const mockErrorResponses = {
  invalidToken: new Error('Invalid token'),
  rateLimitExceeded: new Error('Rate limit exceeded'),
  authenticationFailed: new Error('Authentication failed'),
  certificateValidationFailed: new Error('Certificate validation failed'),
  connectionFailed: new Error('Connection failed'),
  messageSendFailed: new Error('Message send failed')
};

// Setup common mocks
export const setupCommonMocks = () => {
  const mockLogger = createMockLogger();
  const mockOAuthProvider = createMockOAuth2Provider();
  const mockMTLSProvider = createMockMutualTLSProvider();
  const mockA2ACommunication = createMockA2ACommunication();
  const mockA2AAuthService = createMockA2AAuthService();

  return {
    mockLogger,
    mockOAuthProvider,
    mockMTLSProvider,
    mockA2ACommunication,
    mockA2AAuthService
  };
};

// Mock crypto functions
export const mockCrypto = {
  randomBytes: jest.fn((size: number) => Buffer.alloc(size, 'mock-random')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash')
  })),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hmac')
  })),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'mock-encrypted'),
    final: jest.fn(() => 'mock-final'),
    getAuthTag: jest.fn(() => Buffer.from('mock-auth-tag'))
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'mock-decrypted'),
    final: jest.fn(() => 'mock-final'),
    setAuthTag: jest.fn()
  })),
  generateKeyPairSync: jest.fn(() => ({
    privateKey: Buffer.from('mock-private-key'),
    publicKey: Buffer.from('mock-public-key')
  })),
  createCertificate: jest.fn(() => ({
    subject: { CN: 'test-agent' },
    issuer: { CN: 'test-ca' },
    validFrom: new Date(),
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    publicKey: Buffer.from('mock-public-key')
  })),
  createPublicKey: jest.fn(() => Buffer.from('mock-public-key'))
};

// Mock fs functions
export const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn()
};

// Mock axios
export const mockAxios = {
  create: jest.fn(() => ({
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    },
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }))
};
