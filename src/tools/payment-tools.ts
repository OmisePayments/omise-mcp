/**
 * Payment-related MCP Tools
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
import type { PaymentToolParams, ToolResult } from '../types/mcp.js';
import type { 
  CreateChargeRequest, 
  OmiseCharge, 
  OmiseListResponse,
  OmiseMetadata 
} from '../types/omise.js';

export class PaymentTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_charge',
        description: 'Create a new charge for payment processing',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount in the smallest currency unit (satang for THB, cents for USD)',
              minimum: 1
            },
            currency: {
              type: 'string',
              description: 'Currency code (THB, USD, JPY, etc.)',
              pattern: '^[A-Z]{3}$'
            },
            description: {
              type: 'string',
              description: 'Description of the charge',
              maxLength: 255
            },
            customer: {
              type: 'string',
              description: 'Customer ID for the charge'
            },
            card: {
              type: 'string',
              description: 'Card token for payment'
            },
            source: {
              type: 'string',
              description: 'Source ID for payment'
            },
            capture: {
              type: 'boolean',
              description: 'Whether to capture the charge immediately (default: true). Must be false for partial capture. When false with authorization_type=pre_auth, amount is authorized with capture_amount=0, allowing later partial/full capture.',
              default: true
            },
            authorization_type: {
              type: 'string',
              description: 'Authorization type. Use "pre_auth" to enable partial capture (single or multi-capture). Required for partial capture functionality. When set, capture_amount starts at 0 and can be captured in one or multiple calls up to the authorized amount.',
              enum: ['pre_auth']
            },
            return_uri: {
              type: 'string',
              description: 'Return URI for 3D Secure authentication',
              format: 'uri'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the charge',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['amount', 'currency']
        }
      },
      {
        name: 'retrieve_charge',
        description: 'Retrieve charge information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'Charge ID to retrieve'
            }
          },
          required: ['charge_id']
        }
      },
      {
        name: 'list_charges',
        description: 'List all charges with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of charges to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of charges to skip (default: 0)',
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
            status: {
              type: 'string',
              description: 'Filter by charge status',
              enum: ['pending', 'failed', 'successful']
            },
            customer: {
              type: 'string',
              description: 'Filter by customer ID'
            },
            card: {
              type: 'string',
              description: 'Filter by card ID'
            }
          }
        }
      },
      {
        name: 'update_charge',
        description: 'Update charge information (only for pending charges)',
        inputSchema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'Charge ID to update'
            },
            description: {
              type: 'string',
              description: 'New description for the charge',
              maxLength: 255
            },
            metadata: {
              type: 'object',
              description: 'New metadata for the charge',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['charge_id']
        }
      },
      {
        name: 'capture_charge',
        description: 'Capture an authorized charge. Supports full capture, single partial capture, and multi-capture (multiple partial captures up to authorized amount). Prerequisites: charge must be created with capture=false, authorization_type=pre_auth, and currency must match account currency. Payment adapter must support partial capture.',
        inputSchema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'Charge ID to capture'
            },
            amount: {
              type: 'number',
              description: 'Amount to capture in smallest currency unit (sent as capture_amount to API). Must be less than or equal to remaining authorized amount. If omitted, captures full remaining amount. Supports multiple partial captures until the total authorized amount is reached.',
              minimum: 1
            }
          },
          required: ['charge_id']
        }
      },
      {
        name: 'reverse_charge',
        description: 'Reverse an authorized charge',
        inputSchema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'Charge ID to reverse'
            },
            amount: {
              type: 'number',
              description: 'Amount to reverse (must be less than or equal to authorized amount)',
              minimum: 1
            }
          },
          required: ['charge_id']
        }
      },
      {
        name: 'expire_charge',
        description: 'Expire a pending charge',
        inputSchema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'Charge ID to expire'
            }
          },
          required: ['charge_id']
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  private validateCurrency(currency: string): boolean {
    const validCurrencies = ['THB', 'USD', 'JPY', 'EUR', 'GBP', 'SGD', 'HKD', 'AUD', 'CAD', 'CHF', 'CNY', 'DKK', 'NOK', 'SEK', 'NZD', 'PLN', 'CZK', 'HUF', 'ILS', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'VEF', 'RUB', 'INR', 'KRW', 'TWD', 'MYR', 'PHP', 'IDR', 'VND', 'BND', 'LKR', 'BDT', 'PKR', 'NPR', 'AFN', 'KZT', 'UZS', 'KGS', 'TJS', 'TMT', 'MNT', 'AMD', 'AZN', 'GEL', 'KWD', 'BHD', 'QAR', 'AED', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'DZD', 'LYD', 'SDG', 'ETB', 'KES', 'UGX', 'TZS', 'ZAR', 'BWP', 'SZL', 'LSL', 'NAD', 'ZMW', 'MWK', 'ZWL', 'AOA', 'MZN', 'MGA', 'SCR', 'MUR', 'KMF', 'DJF', 'SOS', 'ERN', 'ETB', 'SLL', 'GMD', 'GNF', 'LRD', 'CDF', 'RWF', 'BIF', 'XAF', 'XOF', 'XPF'];
    return validCurrencies.includes(currency.toUpperCase());
  }

  private validateChargeId(chargeId: string): boolean {
    // Omise charge ID format:
    // Test: chrg_test_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    // Production: chrg_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    return /^chrg_(test_)?[0-9a-z]{19}$/.test(chargeId);
  }

  private validateAmount(amount: number, currency: string): boolean {
    if (amount <= 0) return false;
    
    // Check minimum amount by currency
    const minAmounts: { [key: string]: number } = {
      'THB': 1,    // 1 satang
      'USD': 1,    // 1 cent
      'JPY': 1,    // 1 yen
      'EUR': 1,    // 1 cent
      'GBP': 1,    // 1 penny
    };
    
    const minAmount = minAmounts[currency] || 1;
    return amount >= minAmount;
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

  async createCharge(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating charge via MCP tool', params);

      // Validation
      if (!this.validateCurrency(params.currency)) {
        return {
          success: false,
          error: `Invalid currency code: ${params.currency}. Must be a valid 3-letter currency code.`
        };
      }

      if (!this.validateAmount(params.amount, params.currency)) {
        return {
          success: false,
          error: `Invalid amount: ${params.amount}. Amount must be positive and meet minimum requirements for ${params.currency}.`
        };
      }

      const chargeParams: CreateChargeRequest = {
        amount: params.amount,
        currency: params.currency.toUpperCase(),
        description: params.description,
        capture: params.capture ?? true,
        return_uri: params.return_uri,
        metadata: this.sanitizeMetadata(params.metadata),
        ...(params.customer && { customer: params.customer }),
        ...(params.card && { card: params.card }),
        ...(params.source && { source: params.source }),
        ...(params.authorization_type && { authorization_type: params.authorization_type })
      };

      const charge = await this.omiseClient.createCharge(chargeParams);

      return {
        success: true,
        data: charge,
        message: `Charge created successfully with ID: ${charge.id}`
      };
    } catch (error) {
      this.logger.error('Failed to create charge via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveCharge(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving charge via MCP tool', { chargeId: params.charge_id });

      if (!params.charge_id || typeof params.charge_id !== 'string') {
        return {
          success: false,
          error: 'Charge ID is required and must be a string'
        };
      }

      if (!this.validateChargeId(params.charge_id)) {
        return {
          success: false,
          error: 'Invalid charge ID format. Must be in format: chrg_xxxxxxxxxxxxxxxx'
        };
      }

      const charge = await this.omiseClient.getCharge(params.charge_id);

      return {
        success: true,
        data: charge,
        message: `Charge retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve charge via MCP tool', error as Error, { chargeId: params.charge_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async listCharges(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing charges via MCP tool', params);

      // Parameter validation and default value setting
      const queryParams = {
        limit: Math.min(params.limit || 20, 100),
        offset: Math.max(params.offset || 0, 0),
        order: params.order || 'chronological',
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.status && { status: params.status }),
        ...(params.customer && { customer: params.customer }),
        ...(params.card && { card: params.card })
      };

      const charges = await this.omiseClient.listCharges(queryParams);

      return {
        success: true,
        data: charges,
        message: `Retrieved ${charges.data.length} charges (total: ${charges.total})`
      };
    } catch (error) {
      this.logger.error('Failed to list charges via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateCharge(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Updating charge via MCP tool', { chargeId: params.charge_id });

      if (!params.charge_id || typeof params.charge_id !== 'string') {
        return {
          success: false,
          error: 'Charge ID is required and must be a string'
        };
      }

      if (!this.validateChargeId(params.charge_id)) {
        return {
          success: false,
          error: 'Invalid charge ID format. Must be in format: chrg_xxxxxxxxxxxxxxxx'
        };
      }

      const updateData: any = {};
      if (params.description !== undefined) {
        updateData.description = params.description;
      }
      if (params.metadata !== undefined) {
        updateData.metadata = this.sanitizeMetadata(params.metadata);
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No update data provided. Please provide description or metadata to update.'
        };
      }

      const charge = await this.omiseClient.put<OmiseCharge>(`/charges/${params.charge_id}`, updateData);

      return {
        success: true,
        data: charge,
        message: `Charge updated successfully`
      };
    } catch (error) {
      this.logger.error('Failed to update charge via MCP tool', error as Error, { chargeId: params.charge_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async captureCharge(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Capturing charge via MCP tool', { chargeId: params.charge_id });

      if (!params.charge_id || typeof params.charge_id !== 'string') {
        return {
          success: false,
          error: 'Charge ID is required and must be a string'
        };
      }

      if (!this.validateChargeId(params.charge_id)) {
        return {
          success: false,
          error: 'Invalid charge ID format. Must be in format: chrg_xxxxxxxxxxxxxxxx'
        };
      }

      const captureData: any = {};
      if (params.amount !== undefined) {
        if (params.amount <= 0) {
          return {
            success: false,
            error: 'Capture amount must be positive'
          };
        }
        captureData.capture_amount = params.amount;
      }

      const charge = await this.omiseClient.post<OmiseCharge>(`/charges/${params.charge_id}/capture`, captureData);

      return {
        success: true,
        data: charge,
        message: `Charge captured successfully`
      };
    } catch (error) {
      this.logger.error('Failed to capture charge via MCP tool', error as Error, { chargeId: params.charge_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async reverseCharge(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Reversing charge via MCP tool', { chargeId: params.charge_id });

      if (!params.charge_id || typeof params.charge_id !== 'string') {
        return {
          success: false,
          error: 'Charge ID is required and must be a string'
        };
      }

      if (!this.validateChargeId(params.charge_id)) {
        return {
          success: false,
          error: 'Invalid charge ID format. Must be in format: chrg_xxxxxxxxxxxxxxxx'
        };
      }

      const reverseData: any = {};
      if (params.amount !== undefined) {
        if (params.amount <= 0) {
          return {
            success: false,
            error: 'Reverse amount must be positive'
          };
        }
        reverseData.amount = params.amount;
      }

      const charge = await this.omiseClient.post<OmiseCharge>(`/charges/${params.charge_id}/reverse`, reverseData);

      return {
        success: true,
        data: charge,
        message: `Charge reversed successfully`
      };
    } catch (error) {
      this.logger.error('Failed to reverse charge via MCP tool', error as Error, { chargeId: params.charge_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async expireCharge(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Expiring charge via MCP tool', { chargeId: params.charge_id });

      if (!params.charge_id || typeof params.charge_id !== 'string') {
        return {
          success: false,
          error: 'Charge ID is required and must be a string'
        };
      }

      if (!this.validateChargeId(params.charge_id)) {
        return {
          success: false,
          error: 'Invalid charge ID format. Must be in format: chrg_xxxxxxxxxxxxxxxx'
        };
      }

      const charge = await this.omiseClient.post<OmiseCharge>(`/charges/${params.charge_id}/expire`, {});

      return {
        success: true,
        data: charge,
        message: `Charge expired successfully`
      };
    } catch (error) {
      this.logger.error('Failed to expire charge via MCP tool', error as Error, { chargeId: params.charge_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
