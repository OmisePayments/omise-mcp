/**
 * A2AAuthService Unit Tests
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { A2AAuthService } from '../../src/auth';
import { Logger } from '../../src/utils';
import { 
  mockAgentRegistrationInfo
} from '../fixtures/auth-fixtures';
import { 
  createMockLogger,
  mockSuccessfulResponses
} from '../mocks/auth-mocks';

// Mock the dependencies
jest.mock('../../src/auth/oauth2-provider', () => ({
  OAuth2Provider: jest.fn().mockImplementation(() => ({
    registerClient: jest.fn(),
    generateAuthorizationUrl: jest.fn(),
    exchangeCodeForToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    validateToken: jest.fn(),
    revokeToken: jest.fn()
  }))
}));

jest.mock('../../src/auth/mutual-tls', () => ({
  MutualTLSProvider: jest.fn().mockImplementation(() => ({
    issueAgentCertificate: jest.fn(),
    validateAgentCertificate: jest.fn(),
    createTLSContext: jest.fn(),
    revokeAgentCertificate: jest.fn(),
    getCertificateStatus: jest.fn(),
    listCertificates: jest.fn()
  }))
}));

jest.mock('../../src/auth/a2a-communication', () => ({
  A2ACommunication: jest.fn().mockImplementation(() => ({
    initializeConnection: jest.fn(),
    sendMessage: jest.fn(),
    receiveMessage: jest.fn(),
    closeConnection: jest.fn(),
    getConnectionStatus: jest.fn(),
    listConnections: jest.fn()
  }))
}));

describe('A2AAuthService', () => {
  let a2aAuthService: A2AAuthService;
  let mockLogger: jest.Mocked<Logger>;
  let mockConfig: any;

  beforeEach(() => {
    mockLogger = createMockLogger();
    
    mockConfig = {
      agentId: 'test-agent-001',
      agentName: 'Test Agent',
      organization: 'Test Organization',
      baseUrl: 'https://api.example.com',
      oauth: {
        enabled: true,
        clientSecret: 'test-client-secret',
        accessTokenExpiry: 3600,
        refreshTokenExpiry: 86400,
        authorizationCodeExpiry: 600,
        jwtSecret: 'test-jwt-secret'
      },
      mtls: {
        enabled: true,
        certPath: './test-certs',
        certificateValidityDays: 365,
        keySize: 2048
      },
      security: {
        level: 'high',
        requireMFA: false,
        maxSessionDuration: 3600000,
        allowedIPs: ['127.0.0.1'],
        allowedUserAgents: ['Test-Agent/1.0.0'],
        rateLimitPerMinute: 100,
        encryptionRequired: true,
        signingKey: 'test-signing-key',
        encryptionKey: 'test-encryption-key',
        auditLogging: true
      },
      communication: {
        requestTimeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
      }
    };

    a2aAuthService = new A2AAuthService(mockConfig, mockLogger);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize A2A auth service successfully', () => {
      // Assert
      expect(a2aAuthService).toBeDefined();
      // Note: Logger.info may be called during initialization
    });
  });

  describe('registerAgent', () => {
    it('should register agent successfully', async () => {
      // Arrange
      const agentInfo = mockAgentRegistrationInfo;

      // Mock OAuth client registration
      const mockOAuthClient = {
        clientId: 'test-client-001',
        clientSecret: 'test-client-secret',
        name: agentInfo.name,
        redirectUris: agentInfo.redirectUris,
        scopes: agentInfo.scopes,
        grantTypes: agentInfo.grantTypes,
        createdAt: new Date(),
        isActive: true
      };

      // Mock the OAuth provider
      const mockOAuthProvider = (a2aAuthService as any).oauthProvider;
      mockOAuthProvider.registerClient.mockResolvedValue(mockOAuthClient);

      // Mock mTLS certificate
      const mockCertificate = mockSuccessfulResponses.agentCertificate;
      const mockMTLSProvider = (a2aAuthService as any).mTLSProvider;
      mockMTLSProvider.issueAgentCertificate.mockResolvedValue(mockCertificate);

      // Act
      const result = await a2aAuthService.registerAgent(agentInfo);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.agentId).toBe(mockOAuthClient.clientId);
      expect(result.clientSecret).toBe(mockOAuthClient.clientSecret);
      expect(result.certificate).toBe(mockCertificate);
      expect(result.oauthConfig).toBeDefined();
      expect(result.oauthConfig.clientId).toBe(mockOAuthClient.clientId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Registering new agent',
        { name: agentInfo.name }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Agent registered successfully',
        expect.objectContaining({
          agentId: mockOAuthClient.clientId,
          name: agentInfo.name
        })
      );
    });

    it('should register agent without mTLS when disabled', async () => {
      // Arrange
      const configWithoutMTLS = { ...mockConfig, mtls: { ...mockConfig.mtls, enabled: false } };
      const serviceWithoutMTLS = new A2AAuthService(configWithoutMTLS, mockLogger);
      const agentInfo = mockAgentRegistrationInfo;

      const mockOAuthClient = {
        clientId: 'test-client-001',
        clientSecret: 'test-client-secret',
        name: agentInfo.name,
        redirectUris: agentInfo.redirectUris,
        scopes: agentInfo.scopes,
        grantTypes: agentInfo.grantTypes,
        createdAt: new Date(),
        isActive: true
      };

      const mockOAuthProvider = (serviceWithoutMTLS as any).oauthProvider;
      mockOAuthProvider.registerClient.mockResolvedValue(mockOAuthClient);

      // Act
      const result = await serviceWithoutMTLS.registerAgent(agentInfo);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.certificate).toBeUndefined();

      const mockMTLSProvider = (serviceWithoutMTLS as any).mTLSProvider;
      expect(mockMTLSProvider.issueAgentCertificate).not.toHaveBeenCalled();
    });

    it('should validate agent information', async () => {
      // Arrange
      const invalidAgentInfo = { ...mockAgentRegistrationInfo, name: '' };

      // Act & Assert
      await expect(a2aAuthService.registerAgent(invalidAgentInfo))
        .rejects.toThrow('Agent name is required');
    });

    it('should validate redirect URIs', async () => {
      // Arrange
      const invalidAgentInfo = { 
        ...mockAgentRegistrationInfo, 
        redirectUris: ['invalid-uri'] 
      };

      // Act & Assert
      await expect(a2aAuthService.registerAgent(invalidAgentInfo))
        .rejects.toThrow('Invalid redirect URI: invalid-uri');
    });

    it('should validate scopes', async () => {
      // Arrange
      const invalidAgentInfo = { 
        ...mockAgentRegistrationInfo, 
        scopes: ['invalid_scope'] 
      };

      // Act & Assert
      await expect(a2aAuthService.registerAgent(invalidAgentInfo))
        .rejects.toThrow('Invalid scope: invalid_scope');
    });

    it('should handle registration failure', async () => {
      // Arrange
      const agentInfo = mockAgentRegistrationInfo;
      const error = new Error('Registration failed');

      const mockOAuthProvider = (a2aAuthService as any).oauthProvider;
      mockOAuthProvider.registerClient.mockRejectedValue(error);

      // Act & Assert
      await expect(a2aAuthService.registerAgent(agentInfo))
        .rejects.toThrow('Registration failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to register agent',
        error,
        { name: agentInfo.name }
      );
    });
  });

  describe('authenticateAgent', () => {
    it('should authenticate agent successfully', async () => {
      // Arrange
      const clientId = 'test-client-001';
      const clientSecret = 'test-client-secret';
      const securityLevel = 'high';

      const mockTokenResponse = mockSuccessfulResponses.tokenResponse;
      const mockAgentIdentity = { ...mockSuccessfulResponses.agentIdentity, scopes: ['read', 'write', 'admin'] };

      const mockOAuthProvider = (a2aAuthService as any).oauthProvider;
      mockOAuthProvider.exchangeCodeForToken.mockResolvedValue(mockTokenResponse);
      mockOAuthProvider.validateToken.mockResolvedValue(mockAgentIdentity);

      // Act
      const result = await a2aAuthService.authenticateAgent(clientId, clientSecret, securityLevel);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.agentIdentity).toBe(mockAgentIdentity);
      expect(result.sessionId).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Authenticating agent',
        { clientId, securityLevel }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Agent authenticated successfully',
        expect.objectContaining({
          agentId: clientId,
          securityLevel,
          scopes: mockAgentIdentity.scopes
        })
      );
    });

    it('should handle rate limiting', async () => {
      // Arrange
      const clientId = 'test-client-001';
      const clientSecret = 'test-client-secret';

      // Mock rate limiting
      const rateLimitStore = (a2aAuthService as any).rateLimitStore;
      rateLimitStore.set(clientId, {
        agentId: clientId,
        requestsPerMinute: 101, // Exceeds limit
        requestsPerHour: 1,
        requestsPerDay: 1,
        resetTime: new Date(Date.now() + 60000),
        isBlocked: true
      });

      // Act
      const result = await a2aAuthService.authenticateAgent(clientId, clientSecret);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should validate security policy for high security level', async () => {
      // Arrange
      const configWithoutMTLS = { ...mockConfig, mtls: { ...mockConfig.mtls, enabled: false } };
      const serviceWithoutMTLS = new A2AAuthService(configWithoutMTLS, mockLogger);
      
      const clientId = 'test-client-001';
      const clientSecret = 'test-client-secret';
      const securityLevel = 'high';

      const mockTokenResponse = mockSuccessfulResponses.tokenResponse;
      const mockAgentIdentity = { ...mockSuccessfulResponses.agentIdentity, scopes: ['read'] };

      const mockOAuthProvider = (serviceWithoutMTLS as any).oauthProvider;
      mockOAuthProvider.exchangeCodeForToken.mockResolvedValue(mockTokenResponse);
      mockOAuthProvider.validateToken.mockResolvedValue(mockAgentIdentity);

      // Act
      const result = await serviceWithoutMTLS.authenticateAgent(clientId, clientSecret, securityLevel);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('mTLS is required for high security level');
    });

    it('should handle authentication failure', async () => {
      // Arrange
      const clientId = 'test-client-001';
      const clientSecret = 'test-client-secret';
      const error = new Error('Authentication failed');

      const mockOAuthProvider = (a2aAuthService as any).oauthProvider;
      mockOAuthProvider.exchangeCodeForToken.mockRejectedValue(error);

      // Act
      const result = await a2aAuthService.authenticateAgent(clientId, clientSecret);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Agent authentication failed',
        error,
        { clientId }
      );
    });
  });

  describe('establishSecureChannel', () => {
    it('should establish secure channel successfully', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const securityLevel = 'high';

      const mockConnection = {
        targetAgentId,
        oauthToken: 'mock-token',
        tlsContext: {},
        securityLevel,
        establishedAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        messageCount: 0
      };

      const mockHealthCheck = mockSuccessfulResponses.healthCheckResult;

      const mockA2ACommunication = (a2aAuthService as any).a2aCommunication;
      mockA2ACommunication.initializeConnection.mockResolvedValue(mockConnection);
      mockA2ACommunication.sendMessage.mockResolvedValue(mockSuccessfulResponses.a2aResponse);

      // Act
      const result = await a2aAuthService.establishSecureChannel(targetAgentId, securityLevel);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.targetAgentId).toBe(targetAgentId);
      expect(result.securityLevel).toBe(securityLevel);
      expect(result.connectionId).toBe(targetAgentId);
      expect(result.hasTLS).toBe(true);
      expect(result.healthStatus).toBe(mockHealthCheck.status);
      expect(result.establishedAt).toBe(mockConnection.establishedAt);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Establishing secure channel',
        { targetAgentId, securityLevel }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Secure channel established',
        expect.objectContaining({
          targetAgentId,
          securityLevel,
          hasTLS: true
        })
      );
    });

    it('should handle channel establishment failure', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const securityLevel = 'high';
      const error = new Error('Channel establishment failed');

      const mockA2ACommunication = (a2aAuthService as any).a2aCommunication;
      mockA2ACommunication.initializeConnection.mockRejectedValue(error);

      // Act & Assert
      await expect(a2aAuthService.establishSecureChannel(targetAgentId, securityLevel))
        .rejects.toThrow('Channel establishment failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to establish secure channel',
        error,
        { targetAgentId }
      );
    });
  });

  describe('sendSecureMessage', () => {
    beforeEach(async () => {
      // Setup secure channel
      const targetAgentId = 'target-agent-001';
      const mockConnection = {
        targetAgentId,
        oauthToken: 'mock-token',
        tlsContext: {},
        securityLevel: 'high' as const,
        establishedAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        messageCount: 0
      };

      const mockA2ACommunication = (a2aAuthService as any).a2aCommunication;
      mockA2ACommunication.initializeConnection.mockResolvedValue(mockConnection);
      mockA2ACommunication.sendMessage.mockResolvedValue(mockSuccessfulResponses.a2aResponse);

      await a2aAuthService.establishSecureChannel(targetAgentId, 'high');
    });

    it('should send secure message successfully', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const messageType = 'payment_request';
      const payload = { amount: 1000, currency: 'THB' };
      const options = { encrypt: true, priority: 'high' as const };

      // Act
      const result = await a2aAuthService.sendSecureMessage(targetAgentId, messageType, payload, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.targetAgentId).toBe(targetAgentId);
      expect(result.encrypted).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sending secure message',
        expect.objectContaining({
          targetAgentId,
          messageType,
          encrypted: true
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Secure message sent successfully',
        expect.objectContaining({
          messageId: result.messageId,
          targetAgentId,
          encrypted: true
        })
      );
    });

    it('should handle rate limiting for target agent', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const messageType = 'payment_request';
      const payload = { amount: 1000, currency: 'THB' };

      // Mock rate limiting for target agent
      const rateLimitStore = (a2aAuthService as any).rateLimitStore;
      rateLimitStore.set(targetAgentId, {
        agentId: targetAgentId,
        requestsPerMinute: 101, // Exceeds limit
        requestsPerHour: 1,
        requestsPerDay: 1,
        resetTime: new Date(Date.now() + 60000),
        isBlocked: true
      });

      // Act & Assert
      await expect(a2aAuthService.sendSecureMessage(targetAgentId, messageType, payload))
        .rejects.toThrow('Rate limit exceeded for target agent');
    });

    it('should handle message send failure', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const messageType = 'payment_request';
      const payload = { amount: 1000, currency: 'THB' };
      const error = new Error('Message send failed');

      const mockA2ACommunication = (a2aAuthService as any).a2aCommunication;
      mockA2ACommunication.sendMessage.mockRejectedValue(error);

      // Act & Assert
      await expect(a2aAuthService.sendSecureMessage(targetAgentId, messageType, payload))
        .rejects.toThrow('Message send failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send secure message',
        error,
        { targetAgentId, messageType }
      );
    });
  });

  describe('performHealthCheck', () => {
    it('should perform health check successfully', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const mockHealthResponse = {
        success: true,
        messageId: 'health-msg-001',
        payload: { status: 'healthy', uptime: 3600 },
        timestamp: new Date()
      };

      const mockA2ACommunication = (a2aAuthService as any).a2aCommunication;
      mockA2ACommunication.sendMessage.mockResolvedValue(mockHealthResponse);

      // Act
      const result = await a2aAuthService.performHealthCheck(targetAgentId);

      // Assert
      expect(result).toBeDefined();
      expect(result.service).toBe(targetAgentId);
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.lastCheck).toBeInstanceOf(Date);
      expect(result.details).toEqual(mockHealthResponse.payload);
    });

    it('should handle health check failure', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const error = new Error('Health check failed');

      const mockA2ACommunication = (a2aAuthService as any).a2aCommunication;
      mockA2ACommunication.sendMessage.mockRejectedValue(error);

      // Act
      const result = await a2aAuthService.performHealthCheck(targetAgentId);

      // Assert
      expect(result).toBeDefined();
      expect(result.service).toBe(targetAgentId);
      expect(result.status).toBe('unhealthy');
      expect(result.responseTime).toBe(0);
      expect(result.lastCheck).toBeInstanceOf(Date);
      expect(result.details).toEqual({ error: 'Health check failed' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        error,
        { targetAgentId }
      );
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return security metrics', () => {
      // Arrange
      const auditLog = (a2aAuthService as any).auditLog;
      
      // Add some mock audit entries
      auditLog.push(
        { id: '1', timestamp: new Date(), agentId: 'agent-001', action: 'authentication_success', resource: 'auth', success: true, ipAddress: '127.0.0.1', userAgent: 'test', details: {} },
        { id: '2', timestamp: new Date(), agentId: 'agent-001', action: 'authentication_failed', resource: 'auth', success: false, ipAddress: '127.0.0.1', userAgent: 'test', details: { statusCode: 401 } },
        { id: '3', timestamp: new Date(), agentId: 'agent-002', action: 'message_sent', resource: 'communication', success: true, ipAddress: '127.0.0.1', userAgent: 'test', details: {} }
      );

      // Act
      const metrics = a2aAuthService.getSecurityMetrics();

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.blockedRequests).toBe(0);
      expect(metrics.topErrorCodes).toBeDefined();
      expect(metrics.topAgents).toBeDefined();
      expect(metrics.securityEvents).toBeDefined();
    });

    it('should return empty metrics when no audit entries', () => {
      // Act
      const metrics = a2aAuthService.getSecurityMetrics();

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.blockedRequests).toBe(0);
      expect(metrics.topErrorCodes).toHaveLength(0);
      expect(metrics.topAgents).toHaveLength(0);
      expect(metrics.securityEvents).toHaveLength(0);
    });
  });
});
