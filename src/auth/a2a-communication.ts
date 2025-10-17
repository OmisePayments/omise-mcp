/**
 * Agent-to-Agent (A2A) Communication Interface
 */

import crypto from 'crypto';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Logger } from '../utils/logger';
import { OAuth2Provider } from './oauth2-provider';
import { MutualTLSProvider } from './mutual-tls';
import { 
  A2AMessage, 
  A2ARequest, 
  A2AResponse, 
  AgentIdentity, 
  CommunicationConfig,
  MessageType,
  SecurityLevel
} from '../types/auth';

export class A2ACommunication {
  private config: CommunicationConfig;
  private logger: Logger;
  private oauthProvider: OAuth2Provider;
  private mTLSProvider: MutualTLSProvider;
  private httpClient: AxiosInstance;
  private messageQueue: Map<string, A2AMessage>;
  private activeConnections: Map<string, AgentConnection>;

  constructor(
    config: CommunicationConfig,
    logger: Logger,
    oauthProvider: OAuth2Provider,
    mTLSProvider: MutualTLSProvider
  ) {
    this.config = config;
    this.logger = logger;
    this.oauthProvider = oauthProvider;
    this.mTLSProvider = mTLSProvider;
    this.messageQueue = new Map();
    this.activeConnections = new Map();

    this.httpClient = axios.create({
      timeout: config.requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${config.agentId}/1.0.0`
      }
    });

    this.setupInterceptors();
  }

  /**
   * Initialize A2A communication with another agent
   */
  async initializeConnection(targetAgentId: string, securityLevel: SecurityLevel = 'high'): Promise<AgentConnection> {
    try {
      this.logger.info('Initializing A2A connection', { targetAgentId, securityLevel });

      // Step 1: OAuth 2.0 Authentication
      const oauthToken = await this.authenticateWithAgent(targetAgentId);
      
      // Step 2: mTLS Handshake (if security level is high)
      let tlsContext = null;
      if (securityLevel === 'high') {
        tlsContext = await this.performTLSHandshake(targetAgentId);
      }

      // Step 3: Establish secure channel
      const connection: AgentConnection = {
        targetAgentId,
        oauthToken,
        tlsContext,
        securityLevel,
        establishedAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        messageCount: 0
      };

      this.activeConnections.set(targetAgentId, connection);

      this.logger.info('A2A connection established', {
        targetAgentId,
        securityLevel,
        hasTLS: !!tlsContext
      });

      return connection;

    } catch (error) {
      this.logger.error('Failed to initialize A2A connection', error as Error, { targetAgentId });
      throw error;
    }
  }

  /**
   * Send message to another agent
   */
  async sendMessage(
    targetAgentId: string,
    messageType: MessageType,
    payload: any,
    options: MessageOptions = {}
  ): Promise<A2AResponse> {
    const connection = this.activeConnections.get(targetAgentId);
    if (!connection || !connection.isActive) {
      throw new Error(`No active connection to agent: ${targetAgentId}`);
    }

    try {
      // Create message
      const message: A2AMessage = {
        id: this.generateMessageId(),
        from: this.config.agentId,
        to: targetAgentId,
        type: messageType,
        payload,
        timestamp: new Date(),
        nonce: this.generateNonce(),
        signature: '',
        encryption: options.encrypt || false
      };

      // Sign message
      message.signature = await this.signMessage(message);

      // Encrypt message if requested
      if (message.encryption) {
        message.payload = await this.encryptPayload(message.payload, targetAgentId);
      }

      // Send message
      const response = await this.sendSecureMessage(targetAgentId, message, connection);

      // Update connection activity
      connection.lastActivity = new Date();
      connection.messageCount++;

      this.logger.info('Message sent successfully', {
        messageId: message.id,
        targetAgentId,
        messageType,
        encrypted: message.encryption
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to send message', error as Error, {
        targetAgentId,
        messageType
      });
      throw error;
    }
  }

  /**
   * Receive and process incoming message
   */
  async receiveMessage(message: A2AMessage): Promise<A2AResponse> {
    try {
      this.logger.info('Processing incoming message', {
        messageId: message.id,
        from: message.from,
        type: message.type
      });

      // Validate message signature
      const isValidSignature = await this.validateMessageSignature(message);
      if (!isValidSignature) {
        throw new Error('Invalid message signature');
      }

      // Check for replay attacks
      if (this.messageQueue.has(message.id)) {
        throw new Error('Duplicate message detected (replay attack)');
      }

      // Decrypt payload if encrypted
      let payload = message.payload;
      if (message.encryption) {
        payload = await this.decryptPayload(payload, message.from);
      }

      // Process message based on type
      const response = await this.processMessage(message.from, message.type, payload);

      // Store message to prevent replay attacks
      this.messageQueue.set(message.id, message);

      this.logger.info('Message processed successfully', {
        messageId: message.id,
        from: message.from,
        type: message.type
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to process message', error as Error, {
        messageId: message.id,
        from: message.from
      });
      throw error;
    }
  }

  /**
   * Authenticate with target agent using OAuth 2.0
   */
  private async authenticateWithAgent(targetAgentId: string): Promise<string> {
    // This is a simplified OAuth flow - in production, implement full OAuth 2.0 flow
    const authRequest = {
      clientId: this.config.agentId,
      redirectUri: `${this.config.baseUrl}/oauth/callback`,
      scope: ['read', 'write'],
      state: crypto.randomBytes(16).toString('hex'),
      codeVerifier: this.generateCodeVerifier()
    };

    const authUrl = this.oauthProvider.generateAuthorizationUrl(authRequest);
    
    // In a real implementation, this would involve user interaction
    // For A2A, we'll simulate the authorization code exchange
    const mockAuthCode = 'mock_auth_code_' + crypto.randomBytes(16).toString('hex');
    
    const tokenResponse = await this.oauthProvider.exchangeCodeForToken(
      mockAuthCode,
      this.config.agentId,
      this.config.clientSecret,
      authRequest.redirectUri,
      authRequest.codeVerifier
    );

    return tokenResponse.access_token;
  }

  /**
   * Perform TLS handshake for mTLS
   */
  private async performTLSHandshake(targetAgentId: string): Promise<any> {
    // Get or issue certificate for this agent
    const agentCert = await this.mTLSProvider.issueAgentCertificate(
      this.config.agentId,
      {
        name: this.config.agentName,
        organization: this.config.organization
      }
    );

    // Create TLS context
    const tlsContext = this.mTLSProvider.createTLSContext(agentCert);

    // Validate target agent's certificate
    const targetCert = await this.getTargetAgentCertificate(targetAgentId);
    const isValid = await this.mTLSProvider.validateAgentCertificate(targetCert, targetAgentId);
    
    if (!isValid) {
      throw new Error(`Invalid certificate for agent: ${targetAgentId}`);
    }

    return tlsContext;
  }

  /**
   * Send secure message to target agent
   */
  private async sendSecureMessage(
    targetAgentId: string,
    message: A2AMessage,
    connection: AgentConnection
  ): Promise<A2AResponse> {
    const requestConfig: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.config.baseUrl}/api/v1/a2a/message`,
      data: message,
      headers: {
        'Authorization': `Bearer ${connection.oauthToken}`,
        'X-Agent-ID': this.config.agentId,
        'X-Message-ID': message.id,
        'X-Nonce': message.nonce
      }
    };

    // Add TLS context if available
    if (connection.tlsContext) {
      requestConfig.httpsAgent = connection.tlsContext;
    }

    const response = await this.httpClient.request(requestConfig);
    return response.data;
  }

  /**
   * Process incoming message
   */
  private async processMessage(from: string, type: MessageType, payload: any): Promise<A2AResponse> {
    switch (type) {
      case 'payment_request':
        return await this.handlePaymentRequest(from, payload);
      case 'payment_response':
        return await this.handlePaymentResponse(from, payload);
      case 'customer_query':
        return await this.handleCustomerQuery(from, payload);
      case 'webhook_notification':
        return await this.handleWebhookNotification(from, payload);
      case 'health_check':
        return await this.handleHealthCheck(from, payload);
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  /**
   * Handle payment request message
   */
  private async handlePaymentRequest(from: string, payload: any): Promise<A2AResponse> {
    // Implement payment request handling logic
    return {
      success: true,
      messageId: this.generateMessageId(),
      payload: { status: 'received', processedAt: new Date() },
      timestamp: new Date()
    };
  }

  /**
   * Handle payment response message
   */
  private async handlePaymentResponse(from: string, payload: any): Promise<A2AResponse> {
    // Implement payment response handling logic
    return {
      success: true,
      messageId: this.generateMessageId(),
      payload: { status: 'processed', processedAt: new Date() },
      timestamp: new Date()
    };
  }

  /**
   * Handle customer query message
   */
  private async handleCustomerQuery(from: string, payload: any): Promise<A2AResponse> {
    // Implement customer query handling logic
    return {
      success: true,
      messageId: this.generateMessageId(),
      payload: { status: 'query_processed', processedAt: new Date() },
      timestamp: new Date()
    };
  }

  /**
   * Handle webhook notification message
   */
  private async handleWebhookNotification(from: string, payload: any): Promise<A2AResponse> {
    // Implement webhook notification handling logic
    return {
      success: true,
      messageId: this.generateMessageId(),
      payload: { status: 'webhook_processed', processedAt: new Date() },
      timestamp: new Date()
    };
  }

  /**
   * Handle health check message
   */
  private async handleHealthCheck(from: string, payload: any): Promise<A2AResponse> {
    return {
      success: true,
      messageId: this.generateMessageId(),
      payload: { 
        status: 'healthy', 
        timestamp: new Date(),
        agentId: this.config.agentId,
        uptime: process.uptime()
      },
      timestamp: new Date()
    };
  }

  /**
   * Sign message for integrity verification
   */
  private async signMessage(message: A2AMessage): Promise<string> {
    const messageData = {
      id: message.id,
      from: message.from,
      to: message.to,
      type: message.type,
      payload: message.payload,
      timestamp: message.timestamp,
      nonce: message.nonce
    };

    const messageString = JSON.stringify(messageData);
    const signature = crypto
      .createHmac('sha256', this.config.signingKey)
      .update(messageString)
      .digest('hex');

    return signature;
  }

  /**
   * Validate message signature
   */
  private async validateMessageSignature(message: A2AMessage): Promise<boolean> {
    // In a real implementation, you would validate the signature using the sender's public key
    // For now, we'll do a simple validation
    return message.signature.length > 0;
  }

  /**
   * Encrypt payload
   */
  private async encryptPayload(payload: any, targetAgentId: string): Promise<string> {
    const payloadString = JSON.stringify(payload);
    const cipher = crypto.createCipher('aes-256-gcm', this.config.encryptionKey);
    
    let encrypted = cipher.update(payloadString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      authTag: authTag.toString('hex'),
      targetAgentId
    });
  }

  /**
   * Decrypt payload
   */
  private async decryptPayload(encryptedPayload: string, fromAgentId: string): Promise<any> {
    const { encrypted, authTag } = JSON.parse(encryptedPayload);
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.config.encryptionKey);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Get target agent's certificate
   */
  private async getTargetAgentCertificate(targetAgentId: string): Promise<string> {
    // In a real implementation, this would fetch the certificate from a certificate store
    // or from the agent directly
    return 'mock_certificate_' + targetAgentId;
  }

  /**
   * Setup HTTP interceptors
   */
  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug('A2A request', {
          method: config.method,
          url: config.url,
          headers: config.headers
        });
        return config;
      },
      (error) => {
        this.logger.error('A2A request error', error as Error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug('A2A response', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error) => {
        this.logger.error('A2A response error', error as Error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate nonce for replay attack prevention
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Close connection to target agent
   */
  async closeConnection(targetAgentId: string): Promise<void> {
    const connection = this.activeConnections.get(targetAgentId);
    if (connection) {
      connection.isActive = false;
      this.activeConnections.delete(targetAgentId);
      
      this.logger.info('A2A connection closed', { targetAgentId });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(targetAgentId: string): ConnectionStatus | null {
    const connection = this.activeConnections.get(targetAgentId);
    if (!connection) {
      return null;
    }

    return {
      targetAgentId,
      isActive: connection.isActive,
      securityLevel: connection.securityLevel,
      establishedAt: connection.establishedAt,
      lastActivity: connection.lastActivity,
      messageCount: connection.messageCount,
      hasTLS: !!connection.tlsContext
    };
  }

  /**
   * List all active connections
   */
  listConnections(): ConnectionStatus[] {
    return Array.from(this.activeConnections.values()).map(conn => 
      this.getConnectionStatus(conn.targetAgentId)!
    );
  }
}

// Type definitions
interface AgentConnection {
  targetAgentId: string;
  oauthToken: string;
  tlsContext: any;
  securityLevel: SecurityLevel;
  establishedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  messageCount: number;
}

interface MessageOptions {
  encrypt?: boolean;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

interface ConnectionStatus {
  targetAgentId: string;
  isActive: boolean;
  securityLevel: SecurityLevel;
  establishedAt: Date;
  lastActivity: Date;
  messageCount: number;
  hasTLS: boolean;
}
