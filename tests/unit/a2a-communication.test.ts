/**
 * A2ACommunication Unit Tests
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { A2ACommunication } from '../../src/auth';
import { OAuth2Provider } from '../../src/auth';
import { MutualTLSProvider } from '../../src/auth';
import { Logger } from '../../src/utils';
import {
  mockCommunicationConfig,
  mockA2AMessage,
  createMockA2AMessage,
  mockPaymentPayload,
  mockMessageTypes
} from '../fixtures/auth-fixtures';
import {
  createMockLogger,
  createMockOAuth2Provider,
  createMockMutualTLSProvider,
  mockA2AResponse,
  mockAgentCertificate,
  mockCrypto,
  mockAxios
} from '../mocks/auth-mocks';

// Mock crypto module
jest.mock('crypto', () => ({
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
}));

// Mock axios module
jest.mock('axios', () => ({
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
}));

describe('A2ACommunication', () => {
  let a2aCommunication: A2ACommunication;
  let mockLogger: jest.Mocked<Logger>;
  let mockOAuthProvider: jest.Mocked<OAuth2Provider>;
  let mockMTLSProvider: jest.Mocked<MutualTLSProvider>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockOAuthProvider = createMockOAuth2Provider();
    mockMTLSProvider = createMockMutualTLSProvider();

    a2aCommunication = new A2ACommunication(
      mockCommunicationConfig,
      mockLogger,
      mockOAuthProvider,
      mockMTLSProvider
    );

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockOAuthProvider.generateAuthorizationUrl.mockReturnValue('https://example.com/oauth/authorize');
    mockOAuthProvider.exchangeCodeForToken.mockResolvedValue({
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      scope: 'read write'
    });

    mockMTLSProvider.issueAgentCertificate.mockResolvedValue(mockAgentCertificate);
    mockMTLSProvider.validateAgentCertificate.mockResolvedValue(true);
    mockMTLSProvider.createTLSContext.mockReturnValue({} as any);

    // Mock axios
    const axios = require('axios');
    const mockAxiosInstance: any = {
      request: jest.fn<any>().mockResolvedValue({
        data: mockA2AResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      }),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize A2A communication successfully', () => {
      // Assert
      expect(a2aCommunication).toBeDefined();
      expect(a2aCommunication).toBeInstanceOf(A2ACommunication);
    });
  });

  describe('initializeConnection', () => {
    it('should initialize connection with high security level successfully', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const securityLevel = 'high';

      // Act
      const connection = await a2aCommunication.initializeConnection(targetAgentId, securityLevel);

      // Assert
      expect(connection).toBeDefined();
      expect(connection.targetAgentId).toBe(targetAgentId);
      expect(connection.securityLevel).toBe(securityLevel);
      expect(connection.oauthToken).toBe('mock-access-token');
      expect(connection.tlsContext).toBeDefined();
      expect(connection.isActive).toBe(true);
      expect(connection.establishedAt).toBeInstanceOf(Date);
      expect(connection.lastActivity).toBeInstanceOf(Date);
      expect(connection.messageCount).toBe(0);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initializing A2A connection',
        { targetAgentId, securityLevel }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'A2A connection established',
        expect.objectContaining({
          targetAgentId,
          securityLevel,
          hasTLS: true
        })
      );
    });

    it('should initialize connection with standard security level (no mTLS)', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const securityLevel = 'standard';

      // Act
      const connection = await a2aCommunication.initializeConnection(targetAgentId, securityLevel);

      // Assert
      expect(connection).toBeDefined();
      expect(connection.targetAgentId).toBe(targetAgentId);
      expect(connection.securityLevel).toBe(securityLevel);
      expect(connection.oauthToken).toBe('mock-access-token');
      expect(connection.tlsContext).toBeNull();
      expect(connection.isActive).toBe(true);

      expect(mockMTLSProvider.issueAgentCertificate).not.toHaveBeenCalled();
    });

    it('should handle connection initialization failure', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const securityLevel = 'high';
      const error = new Error('Connection failed');

      mockOAuthProvider.exchangeCodeForToken.mockRejectedValue(error);

      // Act & Assert
      await expect(a2aCommunication.initializeConnection(targetAgentId, securityLevel))
        .rejects.toThrow('Connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize A2A connection',
        error,
        { targetAgentId }
      );
    });

    it('should handle mTLS handshake failure', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const securityLevel = 'high';

      mockMTLSProvider.validateAgentCertificate.mockResolvedValue(false);

      // Act & Assert
      await expect(a2aCommunication.initializeConnection(targetAgentId, securityLevel))
        .rejects.toThrow(`Invalid certificate for agent: ${targetAgentId}`);
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      // Setup active connection
      await a2aCommunication.initializeConnection('target-agent-001', 'high');
    });

    it('should send unencrypted message successfully', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const messageType = 'payment_request';
      const payload = mockPaymentPayload;

      // Act
      const response = await a2aCommunication.sendMessage(targetAgentId, messageType, payload);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.messageId).toBeDefined();
      expect(response.payload).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Message sent successfully',
        expect.objectContaining({
          targetAgentId,
          messageType,
          encrypted: false
        })
      );
    });

    it('should send encrypted message successfully', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const messageType = 'payment_request';
      const payload = mockPaymentPayload;
      const options = { encrypt: true };

      // Act
      const response = await a2aCommunication.sendMessage(targetAgentId, messageType, payload, options);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Message sent successfully',
        expect.objectContaining({
          targetAgentId,
          messageType,
          encrypted: true
        })
      );
    });

    it('should throw error for inactive connection', async () => {
      // Arrange
      const targetAgentId = 'non-existent-agent';
      const messageType = 'payment_request';
      const payload = mockPaymentPayload;

      // Act & Assert
      await expect(a2aCommunication.sendMessage(targetAgentId, messageType, payload))
        .rejects.toThrow(`No active connection to agent: ${targetAgentId}`);
    });

    it('should handle message send failure', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      const messageType = 'payment_request';
      const payload = mockPaymentPayload;
      const error: any = new Error('Send failed');

      // Mock axios request failure
      const axios = require('axios');
      const mockAxiosInstance: any = {
        request: jest.fn<any>().mockRejectedValue(error),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      axios.create.mockReturnValue(mockAxiosInstance);

      // Recreate service with failing axios
      const failingService = new A2ACommunication(
        mockCommunicationConfig,
        mockLogger,
        mockOAuthProvider,
        mockMTLSProvider
      );

      // Establish connection first
      await failingService.initializeConnection(targetAgentId);

      // Act & Assert
      await expect(failingService.sendMessage(targetAgentId, messageType, payload))
        .rejects.toThrow('Send failed');
    });

    it('should update connection activity after successful send', async () => {
      // Arrange - need to establish connection first  
      const targetAgentId = 'target-agent-001';
      
      // Reset axios mock to ensure success
      const axios = require('axios');
      const mockAxiosInstance: any = {
        request: jest.fn<any>().mockResolvedValue({
          data: mockA2AResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {}
        }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      axios.create.mockReturnValue(mockAxiosInstance);
      
      // Recreate service with fresh axios mock
      const serviceWithFreshMocks = new A2ACommunication(
        mockCommunicationConfig,
        mockLogger,
        mockOAuthProvider,
        mockMTLSProvider
      );
      
      await serviceWithFreshMocks.initializeConnection(targetAgentId);
      
      const messageType = 'payment_request';
      const payload = mockPaymentPayload;

      // Get original lastActivity
      const initialStatus = serviceWithFreshMocks.getConnectionStatus(targetAgentId);
      const initialLastActivity = initialStatus?.lastActivity;

      // Wait a bit to ensure time passes
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      await serviceWithFreshMocks.sendMessage(targetAgentId, messageType, payload);

      // Assert
      const connectionStatus = serviceWithFreshMocks.getConnectionStatus(targetAgentId);
      expect(connectionStatus).toBeDefined();
      expect(connectionStatus?.messageCount).toBe(1);
      expect(connectionStatus?.lastActivity).toBeInstanceOf(Date);
      expect(connectionStatus?.lastActivity.getTime()).toBeGreaterThan(initialLastActivity?.getTime() || 0);
    });
  });

  describe('receiveMessage', () => {
    it('should process incoming message successfully', async () => {
      // Arrange
      const message = createMockA2AMessage({
        from: 'sender-agent-001',
        type: 'payment_request',
        payload: mockPaymentPayload
      });

      // Act
      const response = await a2aCommunication.receiveMessage(message);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.messageId).toBeDefined();
      expect(response.payload).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing incoming message',
        expect.objectContaining({
          messageId: message.id,
          from: message.from,
          type: message.type
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Message processed successfully',
        expect.objectContaining({
          messageId: message.id,
          from: message.from,
          type: message.type
        })
      );
    });

    it('should handle encrypted message', async () => {
      // Arrange
      // The mock crypto createDecipher returns 'mock-decrypted', so the payload needs to be JSON
      const encryptedPayload = JSON.stringify({
        encrypted: Buffer.from('test-data').toString('hex'),
        authTag: Buffer.from('test-tag').toString('hex')
      });
      
      // Mock crypto to return proper JSON string
      const crypto = require('crypto');
      crypto.createDecipher = jest.fn(() => ({
        update: jest.fn(() => JSON.stringify(mockPaymentPayload)),
        final: jest.fn(() => ''),
        setAuthTag: jest.fn()
      }));
      
      const message = createMockA2AMessage({
        from: 'sender-agent-001',
        type: 'payment_request',
        payload: encryptedPayload,
        encryption: true
      });

      // Act
      const response = await a2aCommunication.receiveMessage(message);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });

    it('should reject message with invalid signature', async () => {
      // Arrange
      const message = createMockA2AMessage({
        from: 'sender-agent-001',
        type: 'payment_request',
        payload: mockPaymentPayload,
        signature: '' // Invalid signature
      });

      // Act & Assert
      await expect(a2aCommunication.receiveMessage(message))
        .rejects.toThrow('Invalid message signature');
    });

    it('should reject duplicate message (replay attack)', async () => {
      // Arrange
      const message = createMockA2AMessage({
        from: 'sender-agent-001',
        type: 'payment_request',
        payload: mockPaymentPayload
      });

      // Process message first time
      await a2aCommunication.receiveMessage(message);

      // Act & Assert - try to process same message again
      await expect(a2aCommunication.receiveMessage(message))
        .rejects.toThrow('Duplicate message detected (replay attack)');
    });

    it('should handle message processing failure', async () => {
      // Arrange
      const message = createMockA2AMessage({
        from: 'sender-agent-001',
        type: 'unknown_type' as any, // Invalid message type
        payload: mockPaymentPayload
      });

      // Act & Assert
      await expect(a2aCommunication.receiveMessage(message))
        .rejects.toThrow('Unknown message type: unknown_type');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to process message',
        expect.any(Error),
        { messageId: message.id, from: message.from }
      );
    });
  });

  describe('message type handlers', () => {
    beforeEach(async () => {
      // Setup active connection
      await a2aCommunication.initializeConnection('target-agent-001', 'high');
    });

    it('should handle payment_request message type', async () => {
      // Arrange
      const message = createMockA2AMessage({
        type: 'payment_request',
        payload: mockPaymentPayload
      });

      // Act
      const response = await a2aCommunication.receiveMessage(message);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.payload).toEqual(
        expect.objectContaining({
          status: 'received',
          processedAt: expect.any(Date)
        })
      );
    });

    it('should handle payment_response message type', async () => {
      // Arrange
      const message = createMockA2AMessage({
        type: 'payment_response',
        payload: { transactionId: 'txn_123', status: 'completed' }
      });

      // Act
      const response = await a2aCommunication.receiveMessage(message);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.payload).toEqual(
        expect.objectContaining({
          status: 'processed',
          processedAt: expect.any(Date)
        })
      );
    });

    it('should handle health_check message type', async () => {
      // Arrange
      const message = createMockA2AMessage({
        type: 'health_check',
        payload: { timestamp: new Date() }
      });

      // Act
      const response = await a2aCommunication.receiveMessage(message);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.payload).toEqual(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(Date),
          agentId: mockCommunicationConfig.agentId,
          uptime: expect.any(Number)
        })
      );
    });

    it('should handle customer_query message type', async () => {
      // Arrange
      const message = createMockA2AMessage({
        type: 'customer_query',
        payload: { customerId: 'cust_123' }
      });

      // Act
      const response = await a2aCommunication.receiveMessage(message);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.payload).toEqual(
        expect.objectContaining({
          status: 'query_processed',
          processedAt: expect.any(Date)
        })
      );
    });

    it('should handle webhook_notification message type', async () => {
      // Arrange
      const message = createMockA2AMessage({
        type: 'webhook_notification',
        payload: { eventId: 'evt_123' }
      });

      // Act
      const response = await a2aCommunication.receiveMessage(message);

      // Assert
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.payload).toEqual(
        expect.objectContaining({
          status: 'webhook_processed',
          processedAt: expect.any(Date)
        })
      );
    });
  });

  describe('closeConnection', () => {
    it('should close active connection successfully', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      await a2aCommunication.initializeConnection(targetAgentId, 'high');

      // Act
      await a2aCommunication.closeConnection(targetAgentId);

      // Assert
      const connectionStatus = a2aCommunication.getConnectionStatus(targetAgentId);
      expect(connectionStatus).toBeNull();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'A2A connection closed',
        { targetAgentId }
      );
    });

    it('should handle closing non-existent connection gracefully', async () => {
      // Act & Assert - should not throw
      await expect(a2aCommunication.closeConnection('non-existent-agent'))
        .resolves.toBeUndefined();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status for active connection', async () => {
      // Arrange
      const targetAgentId = 'target-agent-001';
      await a2aCommunication.initializeConnection(targetAgentId, 'high');

      // Act
      const status = a2aCommunication.getConnectionStatus(targetAgentId);

      // Assert
      expect(status).toBeDefined();
      expect(status?.targetAgentId).toBe(targetAgentId);
      expect(status?.isActive).toBe(true);
      expect(status?.securityLevel).toBe('high');
      expect(status?.hasTLS).toBe(true);
      expect(status?.establishedAt).toBeInstanceOf(Date);
      expect(status?.lastActivity).toBeInstanceOf(Date);
      expect(status?.messageCount).toBe(0);
    });

    it('should return null for non-existent connection', () => {
      // Act
      const status = a2aCommunication.getConnectionStatus('non-existent-agent');

      // Assert
      expect(status).toBeNull();
    });
  });

  describe('listConnections', () => {
    it('should list all active connections', async () => {
      // Arrange
      await a2aCommunication.initializeConnection('agent-001', 'high');
      await a2aCommunication.initializeConnection('agent-002', 'standard');

      // Act
      const connections = a2aCommunication.listConnections();

      // Assert
      expect(connections).toHaveLength(2);
      const connectionIds = connections.map(c => c.targetAgentId);
      expect(connectionIds).toContain('agent-001');
      expect(connectionIds).toContain('agent-002');
      expect(connectionIds).toHaveLength(2);
    });

    it('should return empty array when no connections', () => {
      // Act
      const connections = a2aCommunication.listConnections();

      // Assert
      expect(connections).toHaveLength(0);
    });
  });
});
