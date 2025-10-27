/**
 * Customer-related MCP Tools
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
import type { CustomerToolParams, ToolResult } from '../types/mcp.js';
import type {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  OmiseCustomer,
  OmiseCard,
  OmiseListResponse,
  OmiseMetadata
} from '../types/omise.js';

export class CustomerTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_customer',
        description: 'Create a new customer',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Customer email address',
              format: 'email'
            },
            description: {
              type: 'string',
              description: 'Customer description',
              maxLength: 255
            },
            card: {
              type: 'string',
              description: 'Card token to associate with customer'
            },
            default_card: {
              type: 'string',
              description: 'Default card ID for the customer'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the customer',
              additionalProperties: {
                type: 'string'
              }
            }
          }
        }
      },
      {
        name: 'retrieve_customer',
        description: 'Retrieve customer information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID to retrieve'
            }
          },
          required: ['customer_id']
        }
      },
      {
        name: 'list_customers',
        description: 'List all customers with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of customers to return',
              default: 20,
              minimum: 1,
              maximum: 100
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
              default: 0,
              minimum: 0
            },
            order: {
              type: 'string',
              description: 'Sorting order',
              enum: ['chronological', 'reverse_chronological']
            },
            from: {
              type: 'string',
              description: 'Start date for filtering (ISO 8601)',
              format: 'date-time'
            },
            to: {
              type: 'string',
              description: 'End date for filtering (ISO 8601)',
              format: 'date-time'
            }
          }
        }
      },
      {
        name: 'update_customer',
        description: 'Update customer information',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID to update'
            },
            email: {
              type: 'string',
              description: 'Updated email address',
              format: 'email'
            },
            description: {
              type: 'string',
              description: 'Updated description',
              maxLength: 255
            },
            default_card: {
              type: 'string',
              description: 'Updated default card ID'
            },
            card:{
                type: 'string',
                description: 'An unused token identifier to add as a new card to the customer.'
            },
            metadata: {
              type: 'object',
              description: 'Updated metadata',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['customer_id']
        }
      },
      {
        name: 'destroy_customer',
        description: 'Delete a customer',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID to delete'
            },
            confirm: {
              type: 'boolean',
              description: 'Confirmation flag for deletion',
              default: false
            }
          },
          required: ['customer_id', 'confirm']
        }
      },
      {
        name: 'list_customer_cards',
        description: 'List all cards for a customer',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID to list cards for'
            },
            limit: {
              type: 'number',
              description: 'Number of cards to return',
              default: 20,
              minimum: 1,
              maximum: 100
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
              default: 0,
              minimum: 0
            }
          },
          required: ['customer_id']
        }
      },
      {
        name: 'retrieve_customer_card',
        description: 'Retrieve a specific card for a customer',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID'
            },
            card_id: {
              type: 'string',
              description: 'Card ID to retrieve'
            }
          },
          required: ['customer_id', 'card_id']
        }
      },
      {
        name: 'update_customer_card',
        description: 'Update a customer card',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID'
            },
            card_id: {
              type: 'string',
              description: 'Card ID to update'
            },
            name: {
              type: 'string',
              description: 'Updated name on card',
              maxLength: 255
            },
            expiration_month: {
              type: 'number',
              description: 'Updated expiration month',
              minimum: 1,
              maximum: 12
            },
            expiration_year: {
              type: 'number',
              description: 'Updated expiration year',
              minimum: 2024
            },
            city: {
              type: 'string',
              description: 'Updated city',
              maxLength: 255
            },
            postal_code: {
              type: 'string',
              description: 'Updated postal code',
              maxLength: 20
            }
          },
          required: ['customer_id', 'card_id']
        }
      },
      {
        name: 'destroy_customer_card',
        description: 'Delete a customer card',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer ID'
            },
            card_id: {
              type: 'string',
              description: 'Card ID to delete'
            },
            confirm: {
              type: 'boolean',
              description: 'Confirmation flag for deletion',
              default: false
            }
          },
          required: ['customer_id', 'card_id', 'confirm']
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  private validateCustomerId(customerId: string): boolean {
    // Omise customer ID format:
    // Test: cust_test_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    // Production: cust_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    return /^cust_(test_)?[0-9a-z]{19}$/.test(customerId);
  }

  private validateCardId(cardId: string): boolean {
    // Omise card ID format:
    // Test: card_test_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    // Production: card_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    return /^card_(test_)?[0-9a-z]{19}$/.test(cardId);
  }

  private validateTokenId(tokenId: string): boolean {
    // Validate token ID format
    // Token format: tokn_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    return /^tokn_(test_)?[0-9a-z]{19}$/.test(tokenId);
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private sanitizeMetadata(metadata: any): OmiseMetadata {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const sanitized: OmiseMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' && value.length <= 255) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // ============================================================================
  // Tool Implementation
  // ============================================================================

  async createCustomer(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating customer via MCP tool', params);

      // Validation
      if (params.email && !this.validateEmail(params.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }

      const customerParams: CreateCustomerRequest = {
        email: params.email,
        description: params.description,
        metadata: this.sanitizeMetadata(params.metadata),
        ...(params.card && { card: params.card }),
        ...(params.default_card && { default_card: params.default_card })
      };

      const customer = await this.omiseClient.createCustomer(customerParams);

      return {
        success: true,
        data: customer,
        message: `Customer created successfully with ID: ${customer.id}`
      };
    } catch (error) {
      this.logger.error('Failed to create customer via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveCustomer(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving customer via MCP tool', { customerId: params.customer_id });

      // Validation
      if (!this.validateCustomerId(params.customer_id)) {
        return {
          success: false,
          error: 'Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx'
        };
      }

      const customer = await this.omiseClient.getCustomer(params.customer_id);

      return {
        success: true,
        data: customer,
        message: `Customer retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve customer via MCP tool', error as Error, { customerId: params.customer_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async listCustomers(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing customers via MCP tool', params);

      const listParams = {
        limit: params.limit || 20,
        offset: params.offset || 0,
        ...(params.order && { order: params.order }),
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to })
      };

      const customers = await this.omiseClient.listCustomers(listParams);

      return {
        success: true,
        data: customers,
        message: `Found ${customers.total} customers`
      };
    } catch (error) {
      this.logger.error('Failed to list customers via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateCustomer(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Updating customer via MCP tool', { customerId: params.customer_id });

      // Validation
      if (!this.validateCustomerId(params.customer_id)) {
        return {
          success: false,
          error: 'Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx'
        };
      }

      // Prepare update data
      const updateData: UpdateCustomerRequest = {};
      if (params.email) {
        if (!this.validateEmail(params.email)) {
          return {
            success: false,
            error: 'Invalid email format'
          };
        }
        updateData.email = params.email;
      }
      if (params.description !== undefined) {
        updateData.description = params.description;
      }
      if (params.default_card !== undefined) {
        updateData.default_card = params.default_card;
      }
      if (params.card !== undefined) {
          if (!this.validateTokenId(params.card)) {
              return {
                  success: false,
                  error: 'Invalid token ID format. Must be in format: tokn_xxxxxxxxxxxxxxxx'
              };
          }
          updateData.card = params.card;
      }
      if (params.metadata !== undefined) {
        updateData.metadata = this.sanitizeMetadata(params.metadata);
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No update data provided'
        };
      }

      const customer = await this.omiseClient.put(`/customers/${params.customer_id}`, updateData);

      return {
        success: true,
        data: customer,
        message: `Customer updated successfully`
      };
    } catch (error) {
      this.logger.error('Failed to update customer via MCP tool', error as Error, { customerId: params?.customer_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async destroyCustomer(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Destroying customer via MCP tool', { customerId: params.customer_id });

      if (!this.validateCustomerId(params.customer_id)) {
        return {
          success: false,
          error: 'Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx'
        };
      }

      if (!params.confirm) {
        return {
          success: false,
          error: 'Customer deletion requires confirmation'
        };
      }

      const customer = await this.omiseClient.delete(`/customers/${params.customer_id}`);

      return {
        success: true,
        data: customer,
        message: `Customer deleted successfully`
      };
    } catch (error) {
      this.logger.error('Failed to destroy customer via MCP tool', error as Error, { customerId: params?.customer_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async listCustomerCards(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing customer cards via MCP tool', { customerId: params.customer_id });

      if (!this.validateCustomerId(params.customer_id)) {
        return {
          success: false,
          error: 'Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx'
        };
      }

      const listParams = {
        limit: params.limit || 20,
        offset: params.offset || 0
      };

      const cards = await this.omiseClient.get(`/customers/${params.customer_id}/cards`, listParams) as OmiseListResponse<OmiseCard>;

      return {
        success: true,
        data: cards,
        message: `Found ${cards.total} cards for customer`
      };
    } catch (error) {
      this.logger.error('Failed to list customer cards via MCP tool', error as Error, { customerId: params?.customer_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveCustomerCard(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving customer card via MCP tool', { 
        customerId: params.customer_id, 
        cardId: params.card_id 
      });

      if (!this.validateCustomerId(params.customer_id)) {
        return {
          success: false,
          error: 'Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx'
        };
      }

      if (!this.validateCardId(params.card_id)) {
        return {
          success: false,
          error: 'Invalid card ID format. Must be in format: card_xxxxxxxxxxxxxxxx'
        };
      }

      const card = await this.omiseClient.get(`/customers/${params.customer_id}/cards/${params.card_id}`);

      return {
        success: true,
        data: card,
        message: `Card retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve customer card via MCP tool', error as Error, { 
        customerId: params?.customer_id, 
        cardId: params?.card_id 
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateCustomerCard(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Updating customer card via MCP tool', { 
        customerId: params.customer_id, 
        cardId: params.card_id 
      });

      if (!this.validateCustomerId(params.customer_id)) {
        return {
          success: false,
          error: 'Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx'
        };
      }

      if (!this.validateCardId(params.card_id)) {
        return {
          success: false,
          error: 'Invalid card ID format. Must be in format: card_xxxxxxxxxxxxxxxx'
        };
      }

      // Prepare update data
      const updateData: any = {};
      if (params.name !== undefined) updateData.name = params.name;
      if (params.expiration_month !== undefined) {
        if (params.expiration_month < 1 || params.expiration_month > 12) {
          return {
            success: false,
            error: 'Invalid expiration month. Must be between 1 and 12'
          };
        }
        updateData.expiration_month = params.expiration_month;
      }
      if (params.expiration_year !== undefined) {
        if (params.expiration_year < 2024) {
          return {
            success: false,
            error: 'Invalid expiration year. Must be 2024 or later'
          };
        }
        updateData.expiration_year = params.expiration_year;
      }
      if (params.city !== undefined) updateData.city = params.city;
      if (params.postal_code !== undefined) updateData.postal_code = params.postal_code;

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No update data provided'
        };
      }

      const card = await this.omiseClient.put(`/customers/${params.customer_id}/cards/${params.card_id}`, updateData);

      return {
        success: true,
        data: card,
        message: `Card updated successfully`
      };
    } catch (error) {
      this.logger.error('Failed to update customer card via MCP tool', error as Error, { 
        customerId: params?.customer_id, 
        cardId: params?.card_id 
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async destroyCustomerCard(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Destroying customer card via MCP tool', { 
        customerId: params.customer_id, 
        cardId: params.card_id 
      });

      if (!this.validateCustomerId(params.customer_id)) {
        return {
          success: false,
          error: 'Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx'
        };
      }

      if (!this.validateCardId(params.card_id)) {
        return {
          success: false,
          error: 'Invalid card ID format. Must be in format: card_xxxxxxxxxxxxxxxx'
        };
      }

      if (!params.confirm) {
        return {
          success: false,
          error: 'Card deletion requires confirmation'
        };
      }

      const card = await this.omiseClient.delete(`/customers/${params.customer_id}/cards/${params.card_id}`);

      return {
        success: true,
        data: card,
        message: `Card deleted successfully`
      };
    } catch (error) {
      this.logger.error('Failed to destroy customer card via MCP tool', error as Error, { 
        customerId: params?.customer_id, 
        cardId: params?.card_id 
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}