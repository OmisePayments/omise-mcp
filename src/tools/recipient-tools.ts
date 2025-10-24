/**
 * Recipient-related MCP Tools
 */

// MCP Tool Type Definition
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}
import { OmiseClient } from '../utils/omise-client.js';
import { Logger } from '../utils/logger.js';
import { ToolResult } from '../types/mcp.js';
import { 
  CreateRecipientRequest, 
  UpdateRecipientRequest,
  OmiseRecipient,
  OmiseListResponse,
  OmiseMetadata 
} from '../types/omise.js';

export class RecipientTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_recipient',
        description: 'Create a new recipient for transfers',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Recipient name',
              maxLength: 255
            },
            email: {
              type: 'string',
              description: 'Recipient email address',
              format: 'email'
            },
            description: {
              type: 'string',
              description: 'Recipient description',
              maxLength: 255
            },
            type: {
              type: 'string',
              description: 'Recipient type',
              enum: ['individual', 'corporation'],
              default: 'individual'
            },
            tax_id: {
              type: 'string',
              description: 'Tax ID for the recipient',
              pattern: '^[0-9]{13}$'
            },
            bank_account: {
              type: 'object',
              description: 'Bank account information',
              properties: {
                brand: {
                  type: 'string',
                  description: 'Bank brand code',
                  enum: ['bbl', 'ktb', 'scb', 'bay', 'bcc', 'cimb', 'uob', 'tisco', 'kk', 'tmb']
                },
                number: {
                  type: 'string',
                  description: 'Bank account number',
                  pattern: '^[0-9]{10,15}$'
                },
                name: {
                  type: 'string',
                  description: 'Account holder name',
                  maxLength: 255
                }
              },
              required: ['brand', 'number', 'name']
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the recipient',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['name', 'bank_account']
        }
      },
      {
        name: 'retrieve_recipient',
        description: 'Retrieve recipient information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to retrieve'
            }
          },
          required: ['recipient_id']
        }
      },
      {
        name: 'list_recipients',
        description: 'List all recipients with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of recipients to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of recipients to skip (default: 0)',
              minimum: 0,
              default: 0
            },
            order: {
              type: 'string',
              description: 'Order of results',
              enum: ['chronological', 'reverse_chronological'],
              default: 'chronological'
            },
            from: {
              type: 'string',
              description: 'Start date for filtering (ISO 8601 format)',
              format: 'date-time'
            },
            to: {
              type: 'string',
              description: 'End date for filtering (ISO 8601 format)',
              format: 'date-time'
            },
            type: {
              type: 'string',
              description: 'Filter by recipient type',
              enum: ['individual', 'corporation']
            }
          }
        }
      },
      {
        name: 'update_recipient',
        description: 'Update recipient information',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to update'
            },
            name: {
              type: 'string',
              description: 'New recipient name',
              maxLength: 255
            },
            email: {
              type: 'string',
              description: 'New email address',
              format: 'email'
            },
            description: {
              type: 'string',
              description: 'New description',
              maxLength: 255
            },
            tax_id: {
              type: 'string',
              description: 'New tax ID',
              pattern: '^[0-9]{13}$'
            },
            bank_account: {
              type: 'object',
              description: 'New bank account information',
              properties: {
                brand: {
                  type: 'string',
                  description: 'Bank brand code',
                  enum: ['bbl', 'ktb', 'scb', 'bay', 'bcc', 'cimb', 'uob', 'tisco', 'kk', 'tmb']
                },
                number: {
                  type: 'string',
                  description: 'Bank account number',
                  pattern: '^[0-9]{10,15}$'
                },
                name: {
                  type: 'string',
                  description: 'Account holder name',
                  maxLength: 255
                }
              }
            },
            metadata: {
              type: 'object',
              description: 'New metadata for the recipient',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['recipient_id']
        }
      },
      {
        name: 'destroy_recipient',
        description: 'Delete a recipient',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to delete'
            },
            confirm: {
              type: 'boolean',
              description: 'Confirmation flag to prevent accidental deletion',
              default: false
            }
          },
          required: ['recipient_id']
        }
      },
      {
        name: 'verify_recipient',
        description: 'Verify recipient information and bank account',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to verify'
            },
            verification_method: {
              type: 'string',
              description: 'Verification method',
              enum: ['automatic', 'manual'],
              default: 'automatic'
            }
          },
          required: ['recipient_id']
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  private validateRecipientId(recipientId: string): boolean {
    // Omise recipient ID format:
    // Test: recp_test_xxxxxxxxxxxxxxxx (19 chars after test_)
    // Live: recp_xxxxxxxxxxxxxxxx (19 chars after recp_)
    return /^recp_(test_[a-zA-Z0-9]{19}|[a-zA-Z0-9]{19})$/.test(recipientId);
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateTaxId(taxId: string): boolean {
    // Thai Tax ID format: 13 digits
    return /^[0-9]{13}$/.test(taxId);
  }

  private validateBankAccount(bankAccount: any): { valid: boolean; error?: string } {
    if (!bankAccount) {
      return { valid: false, error: 'Bank account information is required' };
    }

    const validBanks = ['bbl', 'ktb', 'scb', 'bay', 'bcc', 'cimb', 'uob', 'tisco', 'kk', 'tmb'];
    if (!validBanks.includes(bankAccount.brand)) {
      return { valid: false, error: 'Invalid bank brand code' };
    }

    if (!bankAccount.number || !/^[0-9]{10,15}$/.test(bankAccount.number)) {
      return { valid: false, error: 'Invalid bank account number format' };
    }

    if (!bankAccount.name || bankAccount.name.length > 255) {
      return { valid: false, error: 'Invalid account holder name' };
    }

    return { valid: true };
  }

  private sanitizeMetadata(metadata: any): OmiseMetadata | undefined {
    if (!metadata || typeof metadata !== 'object') return undefined;
    
    const sanitized: OmiseMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null) {
        sanitized[key] = null;
      }
    }
    
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  // ============================================================================
  // Tool Implementation
  // ============================================================================

  async createRecipient(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating recipient via MCP tool', { 
        name: params.name, 
        type: params.type 
      });

      // Validation
      if (params.email && !this.validateEmail(params.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }

      if (params.tax_id && !this.validateTaxId(params.tax_id)) {
        return {
          success: false,
          error: 'Invalid tax ID format. Must be 13 digits.'
        };
      }

      const bankValidation = this.validateBankAccount(params.bank_account);
      if (!bankValidation.valid) {
        return {
          success: false,
          error: bankValidation.error
        };
      }

      const recipientParams: CreateRecipientRequest = {
        name: params.name,
        email: params.email,
        description: params.description,
        type: params.type || 'individual',
        tax_id: params.tax_id,
        bank_account: params.bank_account,
        metadata: this.sanitizeMetadata(params.metadata)
      };

      const recipient = await this.omiseClient.post<OmiseRecipient>('/recipients', recipientParams);

      return {
        success: true,
        data: recipient,
        message: `Recipient created successfully with ID: ${recipient.id}`
      };
    } catch (error) {
      this.logger.error('Failed to create recipient via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveRecipient(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving recipient via MCP tool', { recipientId: params.recipient_id });

      if (!this.validateRecipientId(params.recipient_id)) {
        return {
          success: false,
          error: 'Invalid recipient ID format. Must be in format: recp_xxxxxxxxxxxxxxxx (19 chars)'
        };
      }

      const recipient = await this.omiseClient.get<OmiseRecipient>(`/recipients/${params.recipient_id}`);

      return {
        success: true,
        data: recipient,
        message: `Recipient retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve recipient via MCP tool', error as Error, { recipientId: params.recipient_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async listRecipients(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing recipients via MCP tool', params);

      // Parameter validation and default value setting
      const queryParams = {
        limit: Math.min(params.limit || 20, 100),
        offset: Math.max(params.offset || 0, 0),
        order: params.order || 'chronological',
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.type && { type: params.type })
      };

      const recipients = await this.omiseClient.get<OmiseListResponse<OmiseRecipient>>('/recipients', queryParams);

      return {
        success: true,
        data: recipients,
        message: `Retrieved ${recipients.data.length} recipients (total: ${recipients.total})`
      };
    } catch (error) {
      this.logger.error('Failed to list recipients via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateRecipient(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Updating recipient via MCP tool', { recipientId: params.recipient_id });

      if (!this.validateRecipientId(params.recipient_id)) {
        return {
          success: false,
          error: 'Invalid recipient ID format. Must be in format: recp_xxxxxxxxxxxxxxxx (19 chars)'
        };
      }

      if (params.email && !this.validateEmail(params.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }

      if (params.tax_id && !this.validateTaxId(params.tax_id)) {
        return {
          success: false,
          error: 'Invalid tax ID format. Must be 13 digits.'
        };
      }

      if (params.bank_account) {
        const bankValidation = this.validateBankAccount(params.bank_account);
        if (!bankValidation.valid) {
          return {
            success: false,
            error: bankValidation.error
          };
        }
      }

      const updateData: UpdateRecipientRequest = {};
      if (params.name !== undefined) updateData.name = params.name;
      if (params.email !== undefined) updateData.email = params.email;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.tax_id !== undefined) updateData.tax_id = params.tax_id;
      if (params.bank_account !== undefined) updateData.bank_account = params.bank_account;
      if (params.metadata !== undefined) updateData.metadata = this.sanitizeMetadata(params.metadata);

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No update data provided. Please provide name, email, description, tax_id, bank_account, or metadata to update.'
        };
      }

      const recipient = await this.omiseClient.put<OmiseRecipient>(`/recipients/${params.recipient_id}`, updateData);

      return {
        success: true,
        data: recipient,
        message: `Recipient updated successfully`
      };
    } catch (error) {
      this.logger.error('Failed to update recipient via MCP tool', error as Error, { recipientId: params.recipient_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async destroyRecipient(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Destroying recipient via MCP tool', { recipientId: params.recipient_id });

      if (!this.validateRecipientId(params.recipient_id)) {
        return {
          success: false,
          error: 'Invalid recipient ID format. Must be in format: recp_xxxxxxxxxxxxxxxx (19 chars)'
        };
      }

      if (!params.confirm) {
        return {
          success: false,
          error: 'Recipient deletion requires confirmation. Set confirm=true to proceed.'
        };
      }

      const recipient = await this.omiseClient.delete<OmiseRecipient>(`/recipients/${params.recipient_id}`);

      return {
        success: true,
        data: recipient,
        message: `Recipient deleted successfully`
      };
    } catch (error) {
      this.logger.error('Failed to destroy recipient via MCP tool', error as Error, { recipientId: params.recipient_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async verifyRecipient(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Verifying recipient via MCP tool', { recipientId: params.recipient_id });

      if (!this.validateRecipientId(params.recipient_id)) {
        return {
          success: false,
          error: 'Invalid recipient ID format. Must be in format: recp_xxxxxxxxxxxxxxxx (19 chars)'
        };
      }

      const verificationData = {
        verification_method: params.verification_method || 'automatic'
      };

      const recipient = await this.omiseClient.post<OmiseRecipient>(`/recipients/${params.recipient_id}/verify`, verificationData);

      return {
        success: true,
        data: recipient,
        message: `Recipient verification initiated successfully`
      };
    } catch (error) {
      this.logger.error('Failed to verify recipient via MCP tool', error as Error, { recipientId: params.recipient_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
