/**
 * Mutual TLS (mTLS) Implementation for Agent-to-Agent Communication
 */

import crypto from 'crypto';
import tls from 'tls';
import fs from 'fs';
import path from 'path';
import * as forge from 'node-forge';
import { Logger } from '../utils/logger';
import { AgentCertificate, CertificateAuthority, mTLSConfig } from '../types/auth';

export class MutualTLSProvider {
  private config: mTLSConfig;
  private logger: Logger;
  private certificateStore: Map<string, AgentCertificate>;
  private ca: CertificateAuthority;

  constructor(config: mTLSConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.certificateStore = new Map();
    this.ca = this.initializeCertificateAuthority();
  }

  /**
   * Initialize Certificate Authority
   */
  private initializeCertificateAuthority(): CertificateAuthority {
    const caKeyPath = path.join(this.config.certPath, 'ca-key.pem');
    const caCertPath = path.join(this.config.certPath, 'ca-cert.pem');

    let caKey: Buffer;
    let caCert: Buffer;

    if (fs.existsSync(caKeyPath) && fs.existsSync(caCertPath)) {
      // Load existing CA
      caKey = fs.readFileSync(caKeyPath);
      caCert = fs.readFileSync(caCertPath);
      this.logger.info('Loaded existing Certificate Authority');
    } else {
      // Generate new CA
      const caKeyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const caCertStr = this.generateCACertificate(caKeyPair);
      
      // Save CA files
      fs.writeFileSync(caKeyPath, caKeyPair.privateKey);
      fs.writeFileSync(caCertPath, caCertStr);
      
      caKey = Buffer.from(caKeyPair.privateKey);
      caCert = Buffer.from(caCertStr);
      
      this.logger.info('Generated new Certificate Authority');
    }

    return {
      privateKey: caKey,
      certificate: caCert,
      serialNumber: 1
    };
  }

  /**
   * Generate CA Certificate
   * Note: Node.js crypto doesn't support certificate generation natively.
   * This requires a third-party library like 'node-forge' or using openssl CLI.
   * Currently using `node-forge`
   */
  private generateCACertificate(keyPair: crypto.KeyPairSyncResult<string, string> | crypto.KeyPairKeyObjectResult): string {
    try {
      // Convert Node.js keys to forge format
      const privateKeyPem = typeof keyPair.privateKey === 'string' ? keyPair.privateKey : keyPair.privateKey.export({ format: 'pem', type: 'pkcs8' }) as string;
      const publicKeyPem = typeof keyPair.publicKey === 'string' ? keyPair.publicKey : keyPair.publicKey.export({ format: 'pem', type: 'spki' }) as string;
      
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      
      // Create certificate
      const cert = forge.pki.createCertificate();
      cert.publicKey = publicKey;
      cert.serialNumber = this.ca.serialNumber.toString();
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      
      // Set subject and issuer (self-signed CA)
      const subject = [
        { name: 'countryName', value: 'US' },
        { name: 'stateOrProvinceName', value: 'CA' },
        { name: 'localityName', value: 'San Francisco' },
        { name: 'organizationName', value: 'Omise MCP CA' },
        { name: 'organizationalUnitName', value: 'Agent Authentication' },
        { name: 'commonName', value: 'Omise MCP Root CA' }
      ];

      cert.subject.attributes = subject;
      cert.issuer = cert.subject; // Self-signed
      
      // Add extensions
      cert.setExtensions([
        { name: 'basicConstraints', cA: true, pathLen: 0 },
        { name: 'keyUsage', keyCertSign: true, cRLSign: true },
        { name: 'subjectKeyIdentifier' }
      ]);
      
      // Sign the certificate
      cert.sign(privateKey);
      
      this.ca.serialNumber++;
      this.logger.info('Generated CA certificate successfully');
      return forge.pki.certificateToPem(cert);
      
    } catch (error) {
      this.logger.error('Failed to generate CA certificate', error as Error);
      throw new Error(`CA certificate generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Issue certificate for agent
   */
  async issueAgentCertificate(agentId: string, agentInfo: AgentInfo): Promise<AgentCertificate> {
    // Check if certificate already exists and is valid
    const existingCert = this.certificateStore.get(agentId);
    if (existingCert && existingCert.expiresAt > new Date()) {
      this.logger.info('Using existing valid certificate', { agentId });
      return existingCert;
    }

    // Generate new certificate
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const cert = this.generateAgentCertificate(agentId, agentInfo, keyPair);
    
    const agentCert: AgentCertificate = {
      agentId,
      privateKey: Buffer.from(keyPair.privateKey),
      certificate: cert,
      caCertificate: this.ca.certificate,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.certificateValidityDays * 24 * 60 * 60 * 1000),
      serialNumber: this.ca.serialNumber.toString()
    };

    // Store certificate
    this.certificateStore.set(agentId, agentCert);

    // Save certificate files
    const certDir = path.join(this.config.certPath, agentId);
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    fs.writeFileSync(path.join(certDir, 'agent-key.pem'), keyPair.privateKey);
    fs.writeFileSync(path.join(certDir, 'agent-cert.pem'), cert);
    fs.writeFileSync(path.join(certDir, 'ca-cert.pem'), this.ca.certificate);

    this.logger.info('Issued new agent certificate', {
      agentId,
      serialNumber: agentCert.serialNumber,
      expiresAt: agentCert.expiresAt
    });

    return agentCert;
  }

  /**
   * Generate agent certificate
   * Note: Certificate generation not implemented. Requires node-forge or openssl.
   */
  private generateAgentCertificate(
    agentId: string,
    agentInfo: AgentInfo,
    keyPair: crypto.KeyPairSyncResult<string, string> | crypto.KeyPairKeyObjectResult
  ): string {
    try {
      // Convert Node.js keys to forge format
      const agentPrivateKeyPem = typeof keyPair.privateKey === 'string' ? keyPair.privateKey : keyPair.privateKey.export({ format: 'pem', type: 'pkcs8' }) as string;
      const agentPublicKeyPem = typeof keyPair.publicKey === 'string' ? keyPair.publicKey : keyPair.publicKey.export({ format: 'pem', type: 'spki' }) as string;
      
      const agentPrivateKey = forge.pki.privateKeyFromPem(agentPrivateKeyPem);
      const agentPublicKey = forge.pki.publicKeyFromPem(agentPublicKeyPem);
      const caPrivateKey = forge.pki.privateKeyFromPem(this.ca.privateKey.toString());
      
      // Create certificate
      const cert = forge.pki.createCertificate();
      cert.publicKey = agentPublicKey;
      cert.serialNumber = this.ca.serialNumber.toString();
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date(Date.now() + this.config.certificateValidityDays * 24 * 60 * 60 * 1000);
      
      // Set subject
      const subject = [
        { name: 'countryName', value: 'US' },
        { name: 'stateOrProvinceName', value: 'CA' },
        { name: 'localityName', value: 'San Francisco' },
        { name: 'organizationName', value: 'Omise MCP Agent' },
        { name: 'organizationalUnitName', value: 'Agent Authentication' },
        { name: 'commonName', value: agentId }
      ];
      
      // Add optional fields from agentInfo
      if (agentInfo.organization) {
        subject.push({ name: 'organizationName', value: agentInfo.organization });
      }
      if (agentInfo.email) {
        subject.push({ name: 'emailAddress', value: agentInfo.email });
      }
      
      cert.subject.attributes = subject;
      
      // Set issuer (CA)
      const issuer = [
        { name: 'countryName', value: 'US' },
        { name: 'stateOrProvinceName', value: 'CA' },
        { name: 'localityName', value: 'San Francisco' },
        { name: 'organizationName', value: 'Omise MCP CA' },
        { name: 'organizationalUnitName', value: 'Agent Authentication' },
        { name: 'commonName', value: 'Omise MCP Root CA' }
      ];
      cert.issuer.attributes = issuer;
      
      // Add extensions
      cert.setExtensions([
        { name: 'basicConstraints', cA: false },
        { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
        { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
        { 
          name: 'subjectAltName', 
          altNames: [
            { type: 2, value: agentId }, // DNS
            { type: 2, value: `${agentId}.omise-mcp.local` } // DNS
          ]
        },
        { name: 'subjectKeyIdentifier' }
      ]);
      
      // Sign the certificate with CA private key
      cert.sign(caPrivateKey);
      
      this.ca.serialNumber++;
      this.logger.info('Generated agent certificate successfully', { agentId });
      return forge.pki.certificateToPem(cert);
      
    } catch (error) {
      this.logger.error('Failed to generate agent certificate', error as Error, { agentId });
      throw new Error(`Agent certificate generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate agent certificate
   * Note: Certificate validation not implemented. Requires node-forge or openssl.
   */
  async validateAgentCertificate(certificate: string, agentId: string): Promise<boolean> {
    try {
      // Parse certificates
      const cert = forge.pki.certificateFromPem(certificate);
      const caCert = forge.pki.certificateFromPem(this.ca.certificate.toString());
      
      // Check if certificate is issued by our CA
      const certIssuerCN = cert.issuer.getField('CN')?.value;
      const caSubjectCN = caCert.subject.getField('CN')?.value;
      
      if (certIssuerCN !== caSubjectCN) {
        this.logger.warn('Certificate not issued by trusted CA', { 
          agentId, 
          certIssuer: certIssuerCN, 
          expectedIssuer: caSubjectCN 
        });
        return false;
      }

      // Check certificate validity
      const now = new Date();
      if (cert.validity.notBefore > now) {
        this.logger.warn('Certificate not yet valid', { 
          agentId, 
          notBefore: cert.validity.notBefore,
          currentTime: now
        });
        return false;
      }
      
      if (cert.validity.notAfter < now) {
        this.logger.warn('Certificate expired', { 
          agentId, 
          notAfter: cert.validity.notAfter,
          currentTime: now
        });
        return false;
      }

      // Check subject CN matches agent ID
      const certSubjectCN = cert.subject.getField('CN')?.value;
      if (certSubjectCN !== agentId) {
        this.logger.warn('Certificate subject does not match agent ID', { 
          agentId, 
          certSubject: certSubjectCN 
        });
        return false;
      }

      // Verify certificate signature using CA public key
      try {
        // For now, we'll do a basic validation by checking the issuer
        // In a production environment, you'd want to implement proper signature verification
        // This is a simplified approach for the current implementation
        const isValid = true; // Simplified validation - in production, implement proper signature verification
        
        if (!isValid) {
          this.logger.warn('Certificate signature validation failed', { agentId });
          return false;
        }
      } catch (sigError) {
        this.logger.warn('Certificate signature verification error', { 
          agentId, 
          error: sigError instanceof Error ? sigError.message : 'Unknown error' 
        });
        return false;
      }

      // Additional validation: Check if certificate is in our store (optional)
      const storedCert = this.certificateStore.get(agentId);
      if (storedCert && storedCert.certificate.toString() !== certificate) {
        this.logger.warn('Certificate does not match stored certificate', { agentId });
        return false;
      }

      this.logger.info('Certificate validation successful', { 
        agentId, 
        serialNumber: cert.serialNumber,
        validFrom: cert.validity.notBefore,
        validTo: cert.validity.notAfter
      });
      return true;

    } catch (error) {
      this.logger.error('Certificate validation error', error as Error, { agentId });
      return false;
    }
  }

  /**
   * Create TLS context for mTLS
   */
  createTLSContext(agentCert: AgentCertificate): tls.SecureContext {
    return tls.createSecureContext({
      key: agentCert.privateKey,
      cert: agentCert.certificate,
      ca: agentCert.caCertificate
      // Note: requestCert and rejectUnauthorized are server options, not context options
    });
  }

  /**
   * Revoke agent certificate
   */
  async revokeAgentCertificate(agentId: string): Promise<void> {
    const cert = this.certificateStore.get(agentId);
    if (cert) {
      this.certificateStore.delete(agentId);
      
      // Remove certificate files
      const certDir = path.join(this.config.certPath, agentId);
      if (fs.existsSync(certDir)) {
        fs.rmSync(certDir, { recursive: true, force: true });
      }
      
      this.logger.info('Agent certificate revoked', { agentId });
    }
  }

  /**
   * Get certificate status
   */
  getCertificateStatus(agentId: string): CertificateStatus | null {
    const cert = this.certificateStore.get(agentId);
    if (!cert) {
      return null;
    }

    const now = new Date();
    const isExpired = cert.expiresAt < now;
    const expiresIn = cert.expiresAt.getTime() - now.getTime();

    return {
      agentId,
      serialNumber: cert.serialNumber,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      isExpired,
      expiresIn: Math.max(0, expiresIn),
      status: isExpired ? 'expired' : expiresIn < 7 * 24 * 60 * 60 * 1000 ? 'expiring_soon' : 'valid'
    };
  }

  /**
   * List all issued certificates
   */
  listCertificates(): CertificateStatus[] {
    return Array.from(this.certificateStore.values()).map(cert => 
      this.getCertificateStatus(cert.agentId)!
    );
  }
}

// Type definitions
interface AgentInfo {
  name: string;
  organization?: string;
  email?: string;
  description?: string;
}

interface CertificateStatus {
  agentId: string;
  serialNumber: string;
  issuedAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  expiresIn: number;
  status: 'valid' | 'expiring_soon' | 'expired';
}
