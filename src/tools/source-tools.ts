/**
 * Source-related MCP Tools
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
  CreateSourceRequest, 
  OmiseSource,
  OmiseMetadata 
} from '../types/omise.js';

export class SourceTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_source',
        description: 'Create a payment source for various payment methods',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Payment method type',
              enum: [
                'internet_banking_bbl', 'internet_banking_ktb', 'internet_banking_scb', 'internet_banking_bay',
                'internet_banking_bay', 'internet_banking_bay', 'internet_banking_bay', 'internet_banking_bay',
                'alipay', 'alipay_cn', 'alipay_hk',
                'convenience_store', 'convenience_store_7eleven', 'convenience_store_family_mart', 'convenience_store_ministop',
                'installment_bay', 'installment_first_choice', 'installment_kbank', 'installment_ktc', 'installment_scb',
                'promptpay', 'promptpay_qr',
                'truemoney', 'truemoney_wallet'
              ]
            },
            amount: {
              type: 'number',
              description: 'Amount in the smallest currency unit',
              minimum: 1
            },
            currency: {
              type: 'string',
              description: 'Currency code (THB, USD, etc.)',
              pattern: '^[A-Z]{3}$'
            },
            // Internet Banking specific
            bank: {
              type: 'string',
              description: 'Bank code for internet banking',
              enum: ['bbl', 'ktb', 'scb', 'bay', 'bcc', 'cimb', 'uob', 'tisco', 'kk', 'tmb']
            },
            // Alipay specific
            platform_type: {
              type: 'string',
              description: 'Platform type for Alipay',
              enum: ['ios', 'android', 'web']
            },
            // Convenience Store specific
            store: {
              type: 'string',
              description: 'Convenience store chain',
              enum: ['7eleven', 'family_mart', 'ministop', 'lawson']
            },
            // Installment specific
            installment_term: {
              type: 'number',
              description: 'Installment term (3, 6, 9, 10, 12, 18, 24, 36 months)',
              enum: [3, 6, 9, 10, 12, 18, 24, 36]
            },
            // PromptPay specific
            mobile_number: {
              type: 'string',
              description: 'Mobile number for PromptPay',
              pattern: '^[0-9]{10}$'
            },
            national_id: {
              type: 'string',
              description: 'National ID for PromptPay',
              pattern: '^[0-9]{13}$'
            },
            // TrueMoney specific
            phone_number: {
              type: 'string',
              description: 'Phone number for TrueMoney',
              pattern: '^[0-9]{10}$'
            },
            // Common parameters
            return_uri: {
              type: 'string',
              description: 'Return URI for payment completion',
              format: 'uri'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the source',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['type', 'amount', 'currency']
        }
      },
      {
        name: 'retrieve_source',
        description: 'Retrieve source information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            source_id: {
              type: 'string',
              description: 'Source ID to retrieve'
            }
          },
          required: ['source_id']
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  private validateSourceId(sourceId: string): boolean {
    // Omise source ID format:
    // Test: src_test_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    // Production: src_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    return /^src_(test_)?[0-9a-z]{19}$/.test(sourceId);
  }

  private validateCurrency(currency: string): boolean {
    const validCurrencies = ['THB', 'USD', 'JPY', 'EUR', 'GBP', 'SGD', 'HKD', 'AUD', 'CAD', 'CHF', 'CNY'];
    return validCurrencies.includes(currency.toUpperCase());
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

  private validatePaymentMethod(type: string, params: any): { valid: boolean; error?: string } {
    switch (type) {
      case 'internet_banking_bbl':
      case 'internet_banking_ktb':
      case 'internet_banking_scb':
      case 'internet_banking_bay':
        if (!params.bank) {
          return { valid: false, error: 'Bank code is required for internet banking' };
        }
        const validBanks = ['bbl', 'ktb', 'scb', 'bay', 'bcc', 'cimb', 'uob', 'tisco', 'kk', 'tmb'];
        if (!validBanks.includes(params.bank)) {
          return { valid: false, error: 'Invalid bank code' };
        }
        break;

      case 'alipay':
      case 'alipay_cn':
      case 'alipay_hk':
        if (params.platform_type && !['ios', 'android', 'web'].includes(params.platform_type)) {
          return { valid: false, error: 'Invalid platform type for Alipay' };
        }
        break;

      case 'convenience_store':
      case 'convenience_store_7eleven':
      case 'convenience_store_family_mart':
      case 'convenience_store_ministop':
        if (params.store && !['7eleven', 'family_mart', 'ministop', 'lawson'].includes(params.store)) {
          return { valid: false, error: 'Invalid convenience store chain' };
        }
        break;

      case 'installment_bay':
      case 'installment_first_choice':
      case 'installment_kbank':
      case 'installment_ktc':
      case 'installment_scb':
        if (!params.installment_term) {
          return { valid: false, error: 'Installment term is required for installment payments' };
        }
        const validTerms = [3, 6, 9, 10, 12, 18, 24, 36];
        if (!validTerms.includes(params.installment_term)) {
          return { valid: false, error: 'Invalid installment term' };
        }
        break;

      case 'promptpay':
      case 'promptpay_qr':
        if (!params.mobile_number && !params.national_id) {
          return { valid: false, error: 'Mobile number or National ID is required for PromptPay' };
        }
        if (params.mobile_number && !/^[0-9]{10}$/.test(params.mobile_number)) {
          return { valid: false, error: 'Invalid mobile number format' };
        }
        if (params.national_id && !/^[0-9]{13}$/.test(params.national_id)) {
          return { valid: false, error: 'Invalid National ID format' };
        }
        break;

      case 'truemoney':
      case 'truemoney_wallet':
        if (!params.phone_number) {
          return { valid: false, error: 'Phone number is required for TrueMoney' };
        }
        if (!/^[0-9]{10}$/.test(params.phone_number)) {
          return { valid: false, error: 'Invalid phone number format' };
        }
        break;
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

  async createSource(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating source via MCP tool', { 
        type: params.type, 
        amount: params.amount, 
        currency: params.currency 
      });

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

      const validation = this.validatePaymentMethod(params.type, params);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const sourceParams: CreateSourceRequest = {
        type: params.type,
        amount: params.amount,
        currency: params.currency.toUpperCase(),
        return_uri: params.return_uri,
        metadata: this.sanitizeMetadata(params.metadata),
        ...(params.bank && { bank: params.bank }),
        ...(params.platform_type && { platform_type: params.platform_type }),
        ...(params.store && { store: params.store }),
        ...(params.installment_term && { installment_term: params.installment_term }),
        ...(params.mobile_number && { mobile_number: params.mobile_number }),
        ...(params.national_id && { national_id: params.national_id }),
        ...(params.phone_number && { phone_number: params.phone_number })
      };

      const source = await this.omiseClient.post<OmiseSource>('/sources', sourceParams);

      return {
        success: true,
        data: source,
        message: `Source created successfully with ID: ${source.id}`
      };
    } catch (error) {
      this.logger.error('Failed to create source via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveSource(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving source via MCP tool', { sourceId: params.source_id });

      if (!this.validateSourceId(params.source_id)) {
        return {
          success: false,
          error: 'Invalid source ID format. Must be in format: src_xxxxxxxxxxxxxxxx'
        };
      }

      const source = await this.omiseClient.get<OmiseSource>(`/sources/${params.source_id}`);

      return {
        success: true,
        data: source,
        message: `Source retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve source via MCP tool', error as Error, { sourceId: params.source_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
