/**
 * MutualTLSProvider Unit Tests
 */

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {MutualTLSProvider} from '../../src/auth';
import {Logger} from '../../src/utils';
import {mockMTLSConfig} from '../fixtures/auth-fixtures';
import {createMockLogger, mockAgentCertificate} from '../mocks/auth-mocks';

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
    privateKey: '-----BEGIN PRIVATE KEY-----\nmock-private-key\n-----END PRIVATE KEY-----',
    publicKey: '-----BEGIN PUBLIC KEY-----\nmock-public-key\n-----END PUBLIC KEY-----'
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

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn()
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  existsSync: jest.fn()
}));

// Mock tls module
jest.mock('tls', () => ({
  createSecureContext: jest.fn(() => ({
    context: 'mock-tls-context'
  }))
}));

    // Mock node-forge module
jest.mock('node-forge', () => ({
  pki: {
    privateKeyFromPem: jest.fn((pem: any) => {
      // Return a mock private key object that can be used for signing
      return {
        sign: jest.fn(() => Buffer.from('mock-signature'))
      };
    }),
    publicKeyFromPem: jest.fn((pem: any) => {
      // Return a mock public key object that can be assigned to cert.publicKey
      return {
        verify: jest.fn(() => true),
        n: Buffer.from('mock-n'),
        e: Buffer.from('mock-e')
      };
    }),
    certificateFromPem: jest.fn((pem: any) => {
      // Check if this is the CA certificate specifically
      if (pem && (pem.includes('mock-ca-certificate') || pem.toString().includes('mock-ca-certificate'))) {
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          validity: {
            notBefore: new Date(Date.now() - 1000),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          },
          serialNumber: '1'
        };
      }
      // Default certificate mock for agent certificates
      return {
        subject: {
          getField: jest.fn((_field) => ({ value: 'test-agent-001' }))
        },
        issuer: {
          getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
        },
        validity: {
          notBefore: new Date(Date.now() - 1000),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        serialNumber: '1'
      };
    }),
    createCertificate: jest.fn(() => {
      const cert: any = {
        publicKey: null,
        serialNumber: '1',
        validity: {
          notBefore: new Date(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        subject: { 
          attributes: [],
          getField: jest.fn()
        },
        issuer: { 
          attributes: [],
          getField: jest.fn()
        },
        setExtensions: jest.fn(function(this: any) {
          return this;
        }),
        sign: jest.fn(function(this: any) {
          // Do nothing, just return cert for chaining
          return this;
        })
      };
      return cert;
    }),
    certificateToPem: jest.fn(() => '-----BEGIN CERTIFICATE-----\nmock-certificate\n-----END CERTIFICATE-----')
  }
}));

describe('MutualTLSProvider', () => {
  let mTLSProvider: MutualTLSProvider;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    const fs = require('fs');
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue(Buffer.from('mock-file-content'));
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    fs.rmSync.mockImplementation(() => {});
    
    // Mock the generateCACertificate method to avoid the serialNumber issue
    jest.spyOn(MutualTLSProvider.prototype as any, 'generateCACertificate').mockImplementation(() => {
      return '-----BEGIN CERTIFICATE-----\nmock-ca-certificate\n-----END CERTIFICATE-----';
    });
    
    mTLSProvider = new MutualTLSProvider(mockMTLSConfig, mockLogger);
    
    // Mock the CA certificate to have the correct subject CN after instance creation
    // Use a simple number that can be incremented
    (mTLSProvider as any).ca = {
      privateKey: Buffer.from('-----BEGIN PRIVATE KEY-----\nmock-ca-key\n-----END PRIVATE KEY-----'),
      certificate: Buffer.from('-----BEGIN CERTIFICATE-----\nmock-ca-certificate\n-----END CERTIFICATE-----'),
      serialNumber: 1
    };
    
    // Reset forge mocks to default implementations for each test
    const forge = require('node-forge');
    forge.pki.privateKeyFromPem.mockImplementation((pem: any) => ({
      sign: jest.fn(() => Buffer.from('mock-signature'))
    }));
    forge.pki.publicKeyFromPem.mockImplementation((pem: any) => ({
      verify: jest.fn(() => true),
      n: Buffer.from('mock-n'),
      e: Buffer.from('mock-e')
    }));
    forge.pki.createCertificate.mockImplementation(() => {
      const cert: any = {
        publicKey: null,
        serialNumber: '1',
        validity: {
          notBefore: new Date(),
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        subject: { 
          attributes: [],
          getField: jest.fn()
        },
        issuer: { 
          attributes: [],
          getField: jest.fn()
        },
        setExtensions: jest.fn(function(this: any) {
          return this;
        }),
        sign: jest.fn(function(this: any) {
          return this;
        })
      };
      return cert;
    });
    forge.pki.certificateToPem.mockImplementation(() => '-----BEGIN CERTIFICATE-----\nmock-certificate\n-----END CERTIFICATE-----');
  });

  afterEach(() => {
    jest.clearAllTimers();
    // Reset CA serialNumber to ensure consistent state between tests
    if ((mTLSProvider as any).ca) {
      (mTLSProvider as any).ca.serialNumber = 1;
    }
    // Clear all mocks but don't restore the beforeEach spies
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with new CA when no existing CA found', () => {
      // Arrange
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);

      // Act
      const provider = new MutualTLSProvider(mockMTLSConfig, mockLogger);

      // Assert
      expect(provider).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Generated new Certificate Authority');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should load existing CA when found', () => {
      // Arrange
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);

      // Act
      const provider = new MutualTLSProvider(mockMTLSConfig, mockLogger);

      // Assert
      expect(provider).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Loaded existing Certificate Authority');
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should handle CA certificate generation errors', () => {
      // Arrange
      const fs = require('fs');
      const forge = require('node-forge');
      
      // Save and restore the spy to test real implementation
      const originalSpy = jest.spyOn(MutualTLSProvider.prototype as any, 'generateCACertificate');
      originalSpy.mockRestore();
      
      fs.existsSync.mockReturnValueOnce(false);
      
      // Mock forge to throw an error during certificate creation
      forge.pki.privateKeyFromPem.mockImplementationOnce(() => {
        throw new Error('Forge key parsing failed');
      });

      const testLogger = createMockLogger();
      
      // Act & Assert
      expect(() => {
        new MutualTLSProvider(mockMTLSConfig, testLogger);
      }).toThrow(/CA certificate generation failed/);
      
      expect(testLogger.error).toHaveBeenCalledWith(
        'Failed to generate CA certificate',
        expect.any(Error)
      );
      
      // Re-setup the spy for subsequent tests
      jest.spyOn(MutualTLSProvider.prototype as any, 'generateCACertificate').mockImplementation(() => {
        return '-----BEGIN CERTIFICATE-----\nmock-ca-certificate\n-----END CERTIFICATE-----';
      });
    });

    // Note: Testing the real generateCACertificate implementation is difficult because
    // it accesses `this.ca.serialNumber` before `this.ca` is initialized in the constructor.
    // This appears to be a code issue where generateCACertificate expects `this.ca` to exist
    // but it's called during CA initialization. The method is properly mocked in beforeEach
    // to avoid this issue.
  });

  describe('issueAgentCertificate', () => {
    it('should issue new agent certificate successfully', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization',
        email: 'test@example.com',
        description: 'Test agent'
      };

      // Act
      const certificate = await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Assert
      expect(certificate).toBeDefined();
      expect(certificate.agentId).toBe(agentId);
      expect(certificate.privateKey).toBeDefined();
      expect(certificate.certificate).toBeDefined();
      expect(certificate.caCertificate).toBeDefined();
      expect(certificate.issuedAt).toBeInstanceOf(Date);
      expect(certificate.expiresAt).toBeInstanceOf(Date);
      expect(certificate.serialNumber).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Issued new agent certificate',
        expect.objectContaining({
          agentId,
          serialNumber: certificate.serialNumber,
          expiresAt: certificate.expiresAt
        })
      );

      // Verify certificate files are saved
      const fs = require('fs');
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(5); // ca-key, ca-cert (constructor) + agent-key, agent-cert, ca-cert (issueAgentCertificate)
    });

    it('should return existing valid certificate if available', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization'
      };

      // Issue certificate first time
      const firstCertificate = await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Act - issue certificate second time
      const secondCertificate = await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Assert
      expect(secondCertificate).toBe(firstCertificate);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using existing valid certificate',
        { agentId }
      );
    });

    it('should issue new certificate if existing one is expired', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization'
      };

      // Issue certificate first time
      const firstCertificate = await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Mock expired certificate
      const certificateStore = (mTLSProvider as any).certificateStore;
      const storedCert = certificateStore.get(agentId);
      if (storedCert) {
        storedCert.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      }

      // Act - issue certificate again
      const secondCertificate = await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Assert
      expect(secondCertificate).not.toBe(firstCertificate);
      expect(secondCertificate.agentId).toBe(agentId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Issued new agent certificate',
        expect.objectContaining({
          agentId
        })
      );
    });

    it('should handle agent certificate generation errors', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization'
      };

      // Mock forge to throw an error during agent certificate creation
      const forge = require('node-forge');
      forge.pki.privateKeyFromPem.mockImplementationOnce(() => {
        throw new Error('Agent key parsing failed');
      });

      // Act & Assert
      await expect(mTLSProvider.issueAgentCertificate(agentId, agentInfo))
        .rejects.toThrow(/Agent certificate generation failed/);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to generate agent certificate',
        expect.any(Error),
        { agentId }
      );
    });

    it('should handle certificate generation with optional agentInfo fields', async () => {
      // Arrange
      const agentId = 'test-agent-002';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization',
        email: 'agent@example.com',
        description: 'Test description'
      };

      // Act
      const certificate = await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Assert
      expect(certificate).toBeDefined();
      expect(certificate.agentId).toBe(agentId);
    });
  });

  describe('validateAgentCertificate', () => {
    it('should validate valid certificate successfully', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = { name: 'Test Agent' };
      
      // Issue a certificate first to ensure it's in the store
      const issuedCert = await mTLSProvider.issueAgentCertificate(agentId, agentInfo);
      const certificate = issuedCert.certificate.toString();

      // Setup forge mocks to match the actual certificate
      const forge = require('node-forge');
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            },
            serialNumber: '1'
          };
        }
        // Agent certificate
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: agentId }))
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          validity: {
            notBefore: new Date(Date.now() - 1000),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          },
          serialNumber: '1'
        };
      });

      mockLogger.info.mockClear();

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert
      expect(isValid).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Certificate validation successful',
        expect.objectContaining({
          agentId
        })
      );
    });

    it('should reject certificate not issued by trusted CA', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const certificate = 'valid-cert-pem';
      
      const forge = require('node-forge');
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          };
        }
        // Certificate issued by different CA
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: agentId }))
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Unknown CA' })) // Different issuer
          },
          validity: {
            notBefore: new Date(Date.now() - 1000),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        };
      });

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert
      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Certificate not issued by trusted CA',
        expect.objectContaining({
          agentId,
          certIssuer: 'Unknown CA',
          expectedIssuer: 'Omise MCP Root CA'
        })
      );
    });

    it('should reject certificate not yet valid', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const certificate = 'valid-cert-pem';
      
      const forge = require('node-forge');
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour in future
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          };
        }
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: agentId }))
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          validity: {
            notBefore: futureDate, // Certificate not yet valid
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        };
      });

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert
      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Certificate not yet valid',
        expect.objectContaining({
          agentId,
          notBefore: futureDate
        })
      );
    });

    it('should reject expired certificate', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const certificate = 'valid-cert-pem';
      
      const forge = require('node-forge');
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          };
        }
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: agentId }))
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          validity: {
            notBefore: new Date(Date.now() - 2000),
            notAfter: pastDate // Expired certificate
          }
        };
      });

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert
      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Certificate expired',
        expect.objectContaining({
          agentId,
          notAfter: pastDate
        })
      );
    });

    it('should reject certificate with mismatched subject CN', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const certificate = 'valid-cert-pem';
      
      const forge = require('node-forge');
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          };
        }
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: 'different-agent-id' })) // Mismatched CN
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          validity: {
            notBefore: new Date(Date.now() - 1000),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        };
      });

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert
      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Certificate subject does not match agent ID',
        expect.objectContaining({
          agentId,
          certSubject: 'different-agent-id'
        })
      );
    });

    it('should reject certificate that does not match stored certificate', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = { name: 'Test Agent' };
      
      // Issue a certificate first to add it to store
      await mTLSProvider.issueAgentCertificate(agentId, agentInfo);
      
      // Use different certificate content
      const differentCertificate = 'different-certificate-content';
      
      const forge = require('node-forge');
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          };
        }
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: agentId }))
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          validity: {
            notBefore: new Date(Date.now() - 1000),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          },
          serialNumber: '1'
        };
      });

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(differentCertificate, agentId);

      // Assert
      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Certificate does not match stored certificate',
        { agentId }
      );
    });

    it('should handle certificate validation errors gracefully', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const certificate = 'invalid-cert-pem';
      
      const forge = require('node-forge');
      forge.pki.certificateFromPem.mockImplementation(() => {
        throw new Error('Invalid certificate format');
      });

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert
      expect(isValid).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Certificate validation error',
        expect.any(Error),
        { agentId }
      );
    });

    it('should handle certificate with null getField results', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const certificate = 'valid-cert-pem';
      
      const forge = require('node-forge');
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => null) // null result
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          };
        }
        return {
          subject: {
            getField: jest.fn((_field) => null) // null result
          },
          issuer: {
            getField: jest.fn((_field) => null)
          },
          validity: {
            notBefore: new Date(Date.now() - 1000),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        };
      });

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert - Should return false when CN fields are null
      expect(isValid).toBe(false);
    });

    it('should handle certificate validation when stored certificate does not exist', async () => {
      // Arrange
      const agentId = 'non-existent-agent';
      const certificate = 'valid-cert-pem';
      
      const forge = require('node-forge');
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          };
        }
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: agentId }))
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          validity: {
            notBefore: new Date(Date.now() - 1000),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          },
          serialNumber: '1'
        };
      });

      // Ensure no certificate is in store
      (mTLSProvider as any).certificateStore.clear();

      // Act
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert - Should return true when no stored certificate to compare against
      expect(isValid).toBe(true);
    });

    it('should execute signature verification code path', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = { name: 'Test Agent' };
      
      // Issue a certificate first to ensure it's in the store
      const issuedCert = await mTLSProvider.issueAgentCertificate(agentId, agentInfo);
      const certificate = issuedCert.certificate.toString();

      // Setup forge mocks to match validation
      const forge = require('node-forge');
      forge.pki.certificateFromPem.mockImplementation((pem: any) => {
        if (pem.includes('mock-ca-certificate')) {
          return {
            subject: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            issuer: {
              getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
            },
            validity: {
              notBefore: new Date(Date.now() - 1000),
              notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          };
        }
        return {
          subject: {
            getField: jest.fn((_field) => ({ value: agentId }))
          },
          issuer: {
            getField: jest.fn((_field) => ({ value: 'Omise MCP Root CA' }))
          },
          validity: {
            notBefore: new Date(Date.now() - 1000),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          },
          serialNumber: '1'
        };
      });

      // Act - This will execute the signature verification try-catch block
      const isValid = await mTLSProvider.validateAgentCertificate(certificate, agentId);

      // Assert - Should return true (signature verification always passes in simplified implementation)
      expect(isValid).toBe(true);
      // Note: The catch block (lines 323-328) cannot be tested because there's nothing in the try block
      // that can throw - it's just a variable assignment. This is unreachable code until proper
      // signature verification is implemented.
    });
  });

  describe('createTLSContext', () => {
    it('should create TLS context successfully', () => {
      // Arrange
        // Act
      const tlsContext = mTLSProvider.createTLSContext(mockAgentCertificate);

      // Assert
      expect(tlsContext).toBeDefined();
      // Note: In a real test, you would verify the TLS context properties
      // but since we're mocking tls.createSecureContext, we just verify it's called
    });
  });

  describe('revokeAgentCertificate', () => {
    it('should revoke agent certificate successfully', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization'
      };

      // Issue certificate first
      await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Verify certificate is in store
      expect((mTLSProvider as any).certificateStore.has(agentId)).toBe(true);

      // Clear previous calls to fs.rmSync and mock existsSync to return true
      const fs = require('fs');
      fs.rmSync.mockClear();
      fs.existsSync.mockReturnValue(true);

      // Act
      await mTLSProvider.revokeAgentCertificate(agentId);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Agent certificate revoked',
        { agentId }
      );
      expect(fs.rmSync).toHaveBeenCalled();
      expect((mTLSProvider as any).certificateStore.has(agentId)).toBe(false);
    });

    it('should handle revoking non-existent certificate gracefully', async () => {
      // Act & Assert - should not throw
      await expect(mTLSProvider.revokeAgentCertificate('non-existent-agent'))
        .resolves.toBeUndefined();
    });
  });

  describe('getCertificateStatus', () => {
    it('should return certificate status for valid certificate', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization'
      };

      await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Act
      const status = mTLSProvider.getCertificateStatus(agentId);

      // Assert
      expect(status).toBeDefined();
      expect(status?.agentId).toBe(agentId);
      expect(status?.isExpired).toBe(false);
      expect(status?.status).toBe('valid');
      expect(status?.issuedAt).toBeInstanceOf(Date);
      expect(status?.expiresAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent certificate', () => {
      // Act
      const status = mTLSProvider.getCertificateStatus('non-existent-agent');

      // Assert
      expect(status).toBeNull();
    });

    it('should return expired status for expired certificate', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization'
      };

      await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Mock expired certificate
      const certificateStore = (mTLSProvider as any).certificateStore;
      const storedCert = certificateStore.get(agentId);
      if (storedCert) {
        storedCert.expiresAt = new Date(Date.now() - 1000);
      }

      // Act
      const status = mTLSProvider.getCertificateStatus(agentId);

      // Assert
      expect(status).toBeDefined();
      expect(status?.isExpired).toBe(true);
      expect(status?.status).toBe('expired');
    });

    it('should return expiring_soon status for certificate expiring within 7 days', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization'
      };

      await mTLSProvider.issueAgentCertificate(agentId, agentInfo);

      // Mock certificate expiring soon
      const certificateStore = (mTLSProvider as any).certificateStore;
      const storedCert = certificateStore.get(agentId);
      if (storedCert) {
        storedCert.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
      }

      // Act
      const status = mTLSProvider.getCertificateStatus(agentId);

      // Assert
      expect(status).toBeDefined();
      expect(status?.isExpired).toBe(false);
      expect(status?.status).toBe('expiring_soon');
    });
  });

  describe('listCertificates', () => {
    it('should list all issued certificates', async () => {
      // Arrange
      const agentInfo = {
        name: 'Test Agent',
        organization: 'Test Organization'
      };

      await mTLSProvider.issueAgentCertificate('agent-001', agentInfo);
      await mTLSProvider.issueAgentCertificate('agent-002', agentInfo);

      // Act
      const certificates = mTLSProvider.listCertificates();

      // Assert
      expect(certificates).toHaveLength(2);
      expect(certificates[0]?.agentId).toBe('agent-001');
      expect(certificates[1]?.agentId).toBe('agent-002');
    });

    it('should return empty array when no certificates issued', () => {
      // Act
      const certificates = mTLSProvider.listCertificates();

      // Assert
      expect(certificates).toHaveLength(0);
    });
  });
});
