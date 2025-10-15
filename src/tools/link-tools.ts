/**
 * Payment Link-related MCP Tools
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
import type { ToolResult } from '../types/mcp.js';
import type { 
  CreateLinkRequest, 
  OmiseLink,
  OmiseListResponse,
  OmiseMetadata 
} from '../types/omise.js';
import crypto from 'crypto';

export class LinkTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_link',
        description: 'Create a new payment link',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Payment amount in the smallest currency unit',
              minimum: 1
            },
            currency: {
              type: 'string',
              description: 'Currency code (THB, USD, JPY, etc.)',
              pattern: '^[A-Z]{3}$'
            },
            title: {
              type: 'string',
              description: 'Link title',
              maxLength: 255
            },
            description: {
              type: 'string',
              description: 'Link description',
              maxLength: 1000
            },
            multiple: {
              type: 'boolean',
              description: 'Allow multiple payments for the same link',
              default: false
            },
            used: {
              type: 'number',
              description: 'Number of times the link has been used',
              minimum: 0,
              default: 0
            },
            charges: {
              type: 'array',
              description: 'Associated charges',
              items: {
                type: 'string'
              }
            },
            payment_uri: {
              type: 'string',
              description: 'Payment URI for the link',
              format: 'uri'
            },
            expires_at: {
              type: 'string',
              description: 'Link expiration date (ISO 8601 format)',
              format: 'date-time'
            },
            tax_id: {
              type: 'string',
              description: 'Tax ID for the payment',
              pattern: '^[0-9]{13}$'
            },
            tax_inclusive: {
              type: 'boolean',
              description: 'Whether tax is included in the amount',
              default: false
            },
            tax_rate: {
              type: 'number',
              description: 'Tax rate as a percentage (0-100)',
              minimum: 0,
              maximum: 100
            },
            fee_rate: {
              type: 'number',
              description: 'Fee rate as a percentage (0-100)',
              minimum: 0,
              maximum: 100
            },
            custom_fields: {
              type: 'array',
              description: 'Custom fields for the payment form',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Field name',
                    maxLength: 50
                  },
                  label: {
                    type: 'string',
                    description: 'Field label',
                    maxLength: 100
                  },
                  type: {
                    type: 'string',
                    description: 'Field type',
                    enum: ['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox', 'radio']
                  },
                  required: {
                    type: 'boolean',
                    description: 'Whether the field is required',
                    default: false
                  },
                  options: {
                    type: 'array',
                    description: 'Options for select/radio fields',
                    items: {
                      type: 'string'
                    }
                  }
                },
                required: ['name', 'label', 'type']
              }
            },
            branding: {
              type: 'object',
              description: 'Payment page branding',
              properties: {
                logo_url: {
                  type: 'string',
                  description: 'Logo URL for the payment page',
                  format: 'uri'
                },
                primary_color: {
                  type: 'string',
                  description: 'Primary color (hex code)',
                  pattern: '^#[0-9A-Fa-f]{6}$'
                },
                secondary_color: {
                  type: 'string',
                  description: 'Secondary color (hex code)',
                  pattern: '^#[0-9A-Fa-f]{6}$'
                },
                font_family: {
                  type: 'string',
                  description: 'Font family for the payment page',
                  maxLength: 100
                }
              }
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the link',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['amount', 'currency', 'title']
        }
      },
      {
        name: 'retrieve_link',
        description: 'Retrieve payment link information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            link_id: {
              type: 'string',
              description: 'Link ID to retrieve'
            }
          },
          required: ['link_id']
        }
      },
      {
        name: 'list_links',
        description: 'List all payment links with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of links to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of links to skip (default: 0)',
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
              description: 'Filter by link status',
              enum: ['active', 'expired', 'used', 'disabled']
            },
            currency: {
              type: 'string',
              description: 'Filter by currency code',
              pattern: '^[A-Z]{3}$'
            },
            multiple: {
              type: 'boolean',
              description: 'Filter by multiple payment capability'
            }
          }
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  private validateLinkId(linkId: string): boolean {
    // Omise link ID format: link_xxxxxxxxxxxxxxxx
    return /^link_[a-zA-Z0-9]{16}$/.test(linkId);
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

  private validateExpirationDate(expiresAt: string): { valid: boolean; error?: string } {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    
    // Expiration date must be in the future
    if (expirationDate <= now) {
      return { valid: false, error: 'Expiration date must be in the future' };
    }
    
    // Expiration date must be within 1 year
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (expirationDate > oneYearFromNow) {
      return { valid: false, error: 'Expiration date must be within one year' };
    }
    
    return { valid: true };
  }

  private validateTaxId(taxId: string): boolean {
    // Tax ID format validation (13 digits)
    return /^[0-9]{13}$/.test(taxId);
  }

  private validateCustomFields(customFields: any[]): { valid: boolean; error?: string } {
    if (!Array.isArray(customFields)) {
      return { valid: false, error: 'Custom fields must be an array' };
    }

    for (const field of customFields) {
      if (!field.name || !field.label || !field.type) {
        return { valid: false, error: 'Each custom field must have name, label, and type' };
      }

      if (field.name.length > 50) {
        return { valid: false, error: 'Custom field name must be 50 characters or less' };
      }

      if (field.label.length > 100) {
        return { valid: false, error: 'Custom field label must be 100 characters or less' };
      }

      const validTypes = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox', 'radio'];
      if (!validTypes.includes(field.type)) {
        return { valid: false, error: `Invalid field type: ${field.type}` };
      }

      if ((field.type === 'select' || field.type === 'radio') && (!field.options || field.options.length === 0)) {
        return { valid: false, error: 'Select and radio fields must have options' };
      }
    }

    return { valid: true };
  }

  private validateBranding(branding: any): { valid: boolean; error?: string } {
    if (!branding || typeof branding !== 'object') {
      return { valid: true }; // Branding is optional
    }

    if (branding.logo_url) {
      try {
        new URL(branding.logo_url);
      } catch {
        return { valid: false, error: 'Invalid logo URL format' };
      }
    }

    if (branding.primary_color && !/^#[0-9A-Fa-f]{6}$/.test(branding.primary_color)) {
      return { valid: false, error: 'Invalid primary color format. Must be a valid hex color code.' };
    }

    if (branding.secondary_color && !/^#[0-9A-Fa-f]{6}$/.test(branding.secondary_color)) {
      return { valid: false, error: 'Invalid secondary color format. Must be a valid hex color code.' };
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
  // Tax & Fee Calculation
  // ============================================================================

  private calculateTaxAndFees(amount: number, taxRate: number = 0, feeRate: number = 0, taxInclusive: boolean = false): {
    originalAmount: number;
    taxAmount: number;
    feeAmount: number;
    totalAmount: number;
  } {
    let originalAmount = amount;
    let taxAmount = 0;
    let feeAmount = 0;

    if (taxInclusive) {
      // When tax is included
      taxAmount = Math.round(amount * taxRate / (100 + taxRate));
      originalAmount = amount - taxAmount;
    } else {
      // When tax is separate
      taxAmount = Math.round(amount * taxRate / 100);
    }

    // Fees are always calculated separately
    feeAmount = Math.round(amount * feeRate / 100);
    const totalAmount = originalAmount + taxAmount + feeAmount;

    return {
      originalAmount,
      taxAmount,
      feeAmount,
      totalAmount
    };
  }

  // ============================================================================
  // QR Code Generation
  // ============================================================================

  public generateQRCode(paymentUri: string): string {
    // QR code generation (in actual implementation, use QR code library)
    // Here, as a simple implementation, return Base64 encoded URI
    return Buffer.from(paymentUri).toString('base64');
  }

  // ============================================================================
  // Link Usage Statistics
  // ============================================================================

  public calculateLinkStatistics(link: OmiseLink): {
    totalViews: number;
    conversionRate: number;
    averagePaymentAmount: number;
    totalRevenue: number;
  } {
    const totalViews = typeof link.used === 'number' ? link.used : 0;
    const chargesData = link.charges?.data || [];
    const conversionRate = totalViews > 0 ? chargesData.length / totalViews : 0;
    
    let totalRevenue = 0;
    if (chargesData.length > 0) {
      totalRevenue = chargesData.reduce((sum, charge) => sum + charge.amount, 0);
    }
    
    const averagePaymentAmount = chargesData.length > 0 
      ? totalRevenue / chargesData.length 
      : 0;

    return {
      totalViews,
      conversionRate,
      averagePaymentAmount,
      totalRevenue
    };
  }

  // ============================================================================
  // Tool Implementation
  // ============================================================================

  async createLink(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating payment link via MCP tool', { 
        amount: params.amount, 
        currency: params.currency,
        title: params.title 
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

      if (params.expires_at) {
        const expirationValidation = this.validateExpirationDate(params.expires_at);
        if (!expirationValidation.valid) {
          return {
            success: false,
            error: expirationValidation.error
          };
        }
      }

      if (params.tax_id && !this.validateTaxId(params.tax_id)) {
        return {
          success: false,
          error: 'Invalid tax ID format. Must be 13 digits.'
        };
      }

      if (params.custom_fields) {
        const customFieldsValidation = this.validateCustomFields(params.custom_fields);
        if (!customFieldsValidation.valid) {
          return {
            success: false,
            error: customFieldsValidation.error
          };
        }
      }

      if (params.branding) {
        const brandingValidation = this.validateBranding(params.branding);
        if (!brandingValidation.valid) {
          return {
            success: false,
            error: brandingValidation.error
          };
        }
      }

      // Calculate tax and fees
      const taxAndFees = this.calculateTaxAndFees(
        params.amount,
        params.tax_rate || 0,
        params.fee_rate || 0,
        params.tax_inclusive || false
      );

      // Note: Using 'any' because the actual Omise API supports more fields than the type definition
      const linkParams: any = {
        amount: params.amount,
        currency: params.currency.toUpperCase(),
        title: params.title,
        description: params.description,
        multiple: params.multiple || false,
        used: params.used || 0,
        charges: params.charges || [],
        payment_uri: params.payment_uri,
        expires_at: params.expires_at,
        tax_id: params.tax_id,
        tax_inclusive: params.tax_inclusive || false,
        tax_rate: params.tax_rate,
        fee_rate: params.fee_rate,
        custom_fields: params.custom_fields,
        branding: params.branding,
        metadata: this.sanitizeMetadata(params.metadata)
      };

      const link = await this.omiseClient.post<OmiseLink>('/links', linkParams);

      // Generate QR code
      const qrCode = this.generateQRCode(link.payment_uri);

      // Calculate statistics
      const statistics = this.calculateLinkStatistics(link);

      return {
        success: true,
        data: {
          ...link,
          qr_code: qrCode,
          statistics,
          tax_and_fees: taxAndFees
        },
        message: `Payment link created successfully with ID: ${link.id}`
      };
    } catch (error) {
      this.logger.error('Failed to create payment link via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveLink(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving payment link via MCP tool', { linkId: params.link_id });

      if (!this.validateLinkId(params.link_id)) {
        return {
          success: false,
          error: 'Invalid link ID format. Must be in format: link_xxxxxxxxxxxxxxxx'
        };
      }

      const link = await this.omiseClient.get<OmiseLink>(`/links/${params.link_id}`);

      // Generate QR code
      const qrCode = this.generateQRCode(link.payment_uri);

      // Calculate statistics
      const statistics = this.calculateLinkStatistics(link);

      return {
        success: true,
        data: {
          ...link,
          qr_code: qrCode,
          statistics
        },
        message: `Payment link retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve payment link via MCP tool', error as Error, { linkId: params.link_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async listLinks(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing payment links via MCP tool', params);

      // Parameter validation and default value setting
      const queryParams = {
        limit: Math.min(params.limit || 20, 100),
        offset: Math.max(params.offset || 0, 0),
        order: params.order || 'chronological',
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.status && { status: params.status }),
        ...(params.currency && { currency: params.currency }),
        ...(params.multiple !== undefined && { multiple: params.multiple })
      };

      const links = await this.omiseClient.get<OmiseListResponse<OmiseLink>>('/links', queryParams);

      // Add QR code and statistics to each link
      const enrichedLinks = links.data.map(link => ({
        ...link,
        qr_code: this.generateQRCode(link.payment_uri),
        statistics: this.calculateLinkStatistics(link)
      }));

      return {
        success: true,
        data: {
          ...links,
          data: enrichedLinks
        },
        message: `Retrieved ${links.data.length} payment links (total: ${links.total})`
      };
    } catch (error) {
      this.logger.error('Failed to list payment links via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
