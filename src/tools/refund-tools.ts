/**
 * Refund-related MCP Tools
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
  CreateRefundRequest, 
  OmiseRefund,
  OmiseCharge,
  OmiseListResponse,
  OmiseMetadata 
} from '../types/omise.js';

export class RefundTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_refund',
        description: 'Create a refund for a charge',
        inputSchema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'Charge ID to refund'
            },
            amount: {
              type: 'number',
              description: 'Refund amount in the smallest currency unit (optional, defaults to full amount)',
              minimum: 1
            },
            reason: {
              type: 'string',
              description: 'Reason for the refund',
              enum: ['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge'],
              default: 'requested_by_customer'
            },
            description: {
              type: 'string',
              description: 'Refund description',
              maxLength: 255
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the refund',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['charge_id']
        }
      },
      {
        name: 'retrieve_refund',
        description: 'Retrieve refund information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            refund_id: {
              type: 'string',
              description: 'Refund ID to retrieve'
            }
          },
          required: ['refund_id']
        }
      },
      {
        name: 'list_refunds',
        description: 'List all refunds with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of refunds to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of refunds to skip (default: 0)',
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
            charge: {
              type: 'string',
              description: 'Filter by charge ID'
            },
            reason: {
              type: 'string',
              description: 'Filter by refund reason',
              enum: ['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge']
            }
          }
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================
  
  private validateRefundId(refundId: string): boolean {
    // Omise refund ID format: 
    // Test: rfnd_test_xxxxxxxxxxxxxxxx (19 chars after test_)
    // Production: rfnd_xxxxxxxxxxxxxxxx (19 chars after rfnd_)
    return /^rfnd_(test_[a-zA-Z0-9]{19}|[a-zA-Z0-9]{19})$/.test(refundId);
  }

  private validateChargeId(chargeId: string): boolean {
    // Omise charge ID format:
    // Test: chrg_test_xxxxxxxxxxxxxxxx (19 chars after test_)
    // Production: chrg_xxxxxxxxxxxxxxxx (19 chars after chrg_)
    return /^chrg_(test_[a-zA-Z0-9]{19}|[a-zA-Z0-9]{19})$/.test(chargeId);
  }

  private validateRefundReason(reason: string): boolean {
    const validReasons = ['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge'];
    return validReasons.includes(reason);
  }

  private validateRefundAmount(amount: number, maxAmount: number): boolean {
    if (amount <= 0) return false;
    if (amount > maxAmount) return false;
    return true;
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

  async createRefund(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating refund via MCP tool', { 
        chargeId: params.charge_id, 
        amount: params.amount,
        reason: params.reason 
      });

      // Validation
      if (!this.validateChargeId(params.charge_id)) {
        return {
          success: false,
          error: 'Invalid charge ID format. Must be in format: chrg_xxxxxxxxxxxxxxxx'
        };
      }

      if (params.reason && !this.validateRefundReason(params.reason)) {
        return {
          success: false,
          error: 'Invalid refund reason. Must be one of: duplicate, fraudulent, requested_by_customer, expired_uncaptured_charge'
        };
      }

      // First get charge information to confirm maximum refund amount
      let maxRefundAmount: number;
      try {
        const charge = await this.omiseClient.get<OmiseCharge>(`/charges/${params.charge_id}`);
        maxRefundAmount = charge.amount;
        
        // Check existing refunds
        const existingRefunds = await this.omiseClient.get<OmiseListResponse<OmiseRefund>>(`/charges/${params.charge_id}/refunds`);
        const totalRefunded = existingRefunds.data.reduce((sum: number, refund: any) => sum + refund.amount, 0);
        maxRefundAmount = charge.amount - totalRefunded;
      } catch (error) {
        this.logger.error('Failed to get charge information', error as Error, { chargeId: params.charge_id });
        return {
          success: false,
          error: 'Failed to retrieve charge information for refund validation'
        };
      }

      if (maxRefundAmount <= 0) {
        return {
          success: false,
          error: 'No refundable amount available for this charge'
        };
      }

      const refundAmount = params.amount || maxRefundAmount;
      if (!this.validateRefundAmount(refundAmount, maxRefundAmount)) {
        return {
          success: false,
          error: `Invalid refund amount: ${refundAmount}. Must be between 1 and ${maxRefundAmount}`
        };
      }

      const refundParams: CreateRefundRequest = {
        amount: refundAmount,
        reason: params.reason || 'requested_by_customer',
        description: params.description,
        metadata: this.sanitizeMetadata(params.metadata)
      };

      const refund = await this.omiseClient.post<OmiseRefund>(`/charges/${params.charge_id}/refunds`, refundParams);

      return {
        success: true,
        data: refund,
        message: `Refund created successfully with ID: ${refund.id} (Amount: ${refund.amount})`
      };
    } catch (error) {
      this.logger.error('Failed to create refund via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveRefund(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving refund via MCP tool', { refundId: params.refund_id });

      if (!this.validateRefundId(params.refund_id)) {
        return {
          success: false,
          error: 'Invalid refund ID format. Must be in format: rfnd_xxxxxxxxxxxxxxxx'
        };
      }

      const refund = await this.omiseClient.get<OmiseRefund>(`/refunds/${params.refund_id}`);

      return {
        success: true,
        data: refund,
        message: `Refund retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve refund via MCP tool', error as Error, { refundId: params.refund_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async listRefunds(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing refunds via MCP tool', params);

      // Parameter validation and default value setting
      const queryParams = {
        limit: Math.min(params.limit || 20, 100),
        offset: Math.max(params.offset || 0, 0),
        order: params.order || 'chronological',
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.charge && { charge: params.charge }),
        ...(params.reason && { reason: params.reason })
      };

      const refunds = await this.omiseClient.get<OmiseListResponse<OmiseRefund>>('/refunds', queryParams);

      return {
        success: true,
        data: refunds,
        message: `Retrieved ${refunds.data.length} refunds (total: ${refunds.total})`
      };
    } catch (error) {
      this.logger.error('Failed to list refunds via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
