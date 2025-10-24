/**
 * Token-related MCP Tools
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
import { TokenToolParams, ToolResult } from '../types/mcp.js';
import { 
  CreateTokenRequest, 
  OmiseToken 
} from '../types/omise.js';

export class TokenTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_token',
        description: 'Create a card token for secure payment processing',
        inputSchema: {
          type: 'object',
          properties: {
            card_number: {
              type: 'string',
              description: 'Card number (without spaces or dashes)',
              pattern: '^[0-9]{13,19}$'
            },
            card_name: {
              type: 'string',
              description: 'Name on the card',
              maxLength: 255
            },
            expiration_month: {
              type: 'number',
              description: 'Expiration month (1-12)',
              minimum: 1,
              maximum: 12
            },
            expiration_year: {
              type: 'number',
              description: 'Expiration year (4 digits)',
              minimum: 2024
            },
            security_code: {
              type: 'string',
              description: 'Card security code (CVV/CVC)',
              pattern: '^[0-9]{3,4}$'
            },
            city: {
              type: 'string',
              description: 'City for billing address',
              maxLength: 255
            },
            postal_code: {
              type: 'string',
              description: 'Postal code for billing address',
              maxLength: 20
            }
          },
          required: ['card_number', 'card_name', 'expiration_month', 'expiration_year']
        }
      },
      {
        name: 'retrieve_token',
        description: 'Retrieve token information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            token_id: {
              type: 'string',
              description: 'Token ID to retrieve'
            }
          },
          required: ['token_id']
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  private validateTokenId(tokenId: string): boolean {
    // Omise token ID format:
    // Test: tokn_test_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    // Production: tokn_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    return /^tokn_(test_)?[0-9a-z]{19}$/.test(tokenId);
  }

  private validateCardNumber(cardNumber: string): boolean {
    // Remove spaces and dashes, then validate length
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');
    return /^[0-9]{13,19}$/.test(cleanNumber);
  }

  private validateExpirationDate(month: number, year: number): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    if (month < 1 || month > 12) return false;
    
    return true;
  }

  private maskCardNumber(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/[\s-]/g, '');
    if (cleanNumber.length < 8) return cleanNumber;
    return cleanNumber.replace(/\d(?=\d{4})/g, '*');
  }

  // ============================================================================
  // Tool Implementation
  // ============================================================================

  async createToken(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating token via MCP tool', { 
        cardNumber: this.maskCardNumber(params.card_number),
        cardName: params.card_name 
      });

      // Validation
      if (!this.validateCardNumber(params.card_number)) {
        return {
          success: false,
          error: 'Invalid card number format. Must be 13-19 digits.'
        };
      }

      if (!this.validateExpirationDate(params.expiration_month, params.expiration_year)) {
        return {
          success: false,
          error: 'Invalid expiration date. Card must not be expired.'
        };
      }

      if (params.security_code && !/^[0-9]{3,4}$/.test(params.security_code)) {
        return {
          success: false,
          error: 'Invalid security code format. Must be 3-4 digits.'
        };
      }

      const tokenParams: CreateTokenRequest = {
        card: {
          name: params.card_name,
          number: params.card_number.replace(/[\s-]/g, ''),
          expiration_month: params.expiration_month,
          expiration_year: params.expiration_year,
          ...(params.security_code && { security_code: params.security_code }),
          ...(params.city && { city: params.city }),
          ...(params.postal_code && { postal_code: params.postal_code })
        }
      };

      const token = await this.omiseClient.createToken(tokenParams);

      return {
        success: true,
        data: token,
        message: `Token created successfully with ID: ${token.id}`
      };
    } catch (error) {
      this.logger.error('Failed to create token via MCP tool', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveToken(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving token via MCP tool', { tokenId: params.token_id });

      if (!this.validateTokenId(params.token_id)) {
        return {
          success: false,
          error: 'Invalid token ID format. Must be in format: tokn_xxxxxxxxxxxxxxxx'
        };
      }

      const token = await this.omiseClient.getToken(params.token_id);

      return {
        success: true,
        data: token,
        message: `Token retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve token via MCP tool', error as Error, { tokenId: params.token_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
