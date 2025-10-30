/**
 * Authentication and A2A Communication Type Definitions
 */

export interface AgentIdentity {
  clientId: string;
  name: string;
  scopes: string[];
  issuedAt: Date;
  expiresAt: Date;
}

export interface AgentRegistrationInfo {
  name: string;
  organization?: string;
  email?: string;
  description?: string;
  redirectUris: string[];
  scopes?: string[];
  grantTypes?: string[];
}

export interface OAuthConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
  authorizationCodeExpiry: number;
  jwtSecret: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  scope: string[];
  state: string;
  codeVerifier: string;
}

export interface AgentCertificate {
  agentId: string;
  privateKey: Buffer;
  certificate: string;
  caCertificate: Buffer;
  issuedAt: Date;
  expiresAt: Date;
  serialNumber: string;
}

export interface CertificateAuthority {
  privateKey: Buffer;
  certificate: Buffer;
  serialNumber: number;
}

export interface mTLSConfig {
  certPath: string;
  certificateValidityDays: number;
  keySize: number;
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: any;
  timestamp: Date;
  nonce: string;
  signature: string;
  encryption: boolean;
}

export interface A2ARequest {
  messageId: string;
  from: string;
  to: string;
  type: MessageType;
  payload: any;
  timestamp: Date;
  nonce: string;
  signature: string;
}

export interface A2AResponse {
  success: boolean;
  messageId: string;
  payload: any;
  timestamp: Date;
  error?: string;
}

export interface CommunicationConfig {
  agentId: string;
  agentName: string;
  organization?: string;
  baseUrl: string;
  clientSecret: string;
  signingKey: string;
  encryptionKey: string;
  requestTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export type MessageType = 
  | 'payment_request'
  | 'payment_response'
  | 'customer_query'
  | 'webhook_notification'
  | 'health_check'
  | 'error_notification'
  | 'status_update';

export type SecurityLevel = 'basic' | 'standard' | 'high';

export interface AuthenticationResult {
  success: boolean;
  agentIdentity?: AgentIdentity;
  error?: string;
  requiresMFA?: boolean;
  sessionId?: string;
}

export interface SessionInfo {
  sessionId: string;
  agentId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  isActive: boolean;
  securityLevel: SecurityLevel;
}

export interface SecurityPolicy {
  requireMFA: boolean;
  maxSessionDuration: number;
  allowedIPs: string[];
  allowedUserAgents: string[];
  rateLimitPerMinute: number;
  encryptionRequired: boolean;
  auditLogging: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  action: string;
  resource: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  details: any;
}

export interface RateLimitInfo {
  agentId: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  resetTime: Date;
  isBlocked: boolean;
}

export interface MultiFactorAuth {
  enabled: boolean;
  methods: ('sms' | 'email' | 'totp' | 'hardware')[];
  backupCodes: string[];
  lastUsed: Date;
}

export interface AgentPermissions {
  agentId: string;
  permissions: Permission[];
  roles: string[];
  restrictions: Restriction[];
  expiresAt?: Date;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Condition[];
}

export interface Restriction {
  type: 'ip' | 'time' | 'resource' | 'rate';
  value: any;
  description: string;
}

export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
}

export interface WebhookSecurity {
  enabled: boolean;
  secret: string;
  allowedIPs: string[];
  signatureHeader: string;
  timestampTolerance: number;
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
  keySize: number;
  ivSize: number;
  tagSize: number;
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2';
}

export interface ComplianceConfig {
  pciDSS: boolean;
  gdpr: boolean;
  sox: boolean;
  hipaa: boolean;
  auditRetentionDays: number;
  dataEncryptionAtRest: boolean;
  dataEncryptionInTransit: boolean;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  details: any;
}

export interface SecurityMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  blockedRequests: number;
  averageResponseTime: number;
  topErrorCodes: Array<{ code: number; count: number }>;
  topAgents: Array<{ agentId: string; requestCount: number }>;
  securityEvents: Array<{ type: string; count: number; lastOccurrence: Date }>;
}

export interface ThreatDetection {
  enabled: boolean;
  suspiciousActivityThreshold: number;
  bruteForceThreshold: number;
  anomalyDetection: boolean;
  ipReputationCheck: boolean;
  geoBlocking: boolean;
  allowedCountries: string[];
}

export interface IncidentResponse {
  incidentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'security' | 'performance' | 'availability';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  affectedAgents: string[];
  actions: IncidentAction[];
}

export interface IncidentAction {
  action: string;
  timestamp: Date;
  performedBy: string;
  details: any;
}

export interface BackupConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  retentionDays: number;
  encryption: boolean;
  compression: boolean;
  location: 'local' | 's3' | 'gcs' | 'azure';
}

export interface DisasterRecovery {
  enabled: boolean;
  rto: number; // Recovery Time Objective in minutes
  rpo: number; // Recovery Point Objective in minutes
  backupLocation: string;
  failoverLocation: string;
  testFrequency: 'monthly' | 'quarterly' | 'annually';
  lastTestDate?: Date;
}
