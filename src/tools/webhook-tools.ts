/**
 * Webhook Management-related MCP Tools
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
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
  OmiseWebhookEndpoint,
  OmiseListResponse,
  OmiseMetadata 
} from '../types/omise.js';
import crypto from 'crypto';

export class WebhookTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'webhook_endpoint_list',
        description: 'List all webhook endpoints',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of endpoints to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of endpoints to skip (default: 0)',
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
              description: 'Filter by endpoint status',
              enum: ['active', 'inactive', 'disabled']
            }
          }
        }
      },
      {
        name: 'webhook_endpoint_create',
        description: 'Create a new webhook endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Webhook endpoint URL',
              format: 'uri'
            },
            description: {
              type: 'string',
              description: 'Endpoint description',
              maxLength: 255
            },
            events: {
              type: 'array',
              description: 'Events to listen for',
              items: {
                type: 'string',
                enum: [
                  'charge.create', 'charge.complete', 'charge.reverse',
                  'customer.create', 'customer.update', 'customer.destroy',
                  'card.create', 'card.update', 'card.destroy',
                  'transfer.create', 'transfer.update', 'transfer.destroy',
                  'recipient.create', 'recipient.update', 'recipient.destroy',
                  'refund.create', 'refund.destroy',
                  'dispute.create', 'dispute.update', 'dispute.accept',
                  'schedule.create', 'schedule.destroy',
                  'link.create', 'link.destroy'
                ]
              },
              minItems: 1
            },
            secret_key: {
              type: 'string',
              description: 'Secret key for webhook signature verification',
              minLength: 16,
              maxLength: 64
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the endpoint',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['url', 'events']
        }
      },
      {
        name: 'webhook_endpoint_retrieve',
        description: 'Retrieve webhook endpoint information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Webhook endpoint ID to retrieve'
            }
          },
          required: ['endpoint_id']
        }
      },
      {
        name: 'webhook_endpoint_update',
        description: 'Update webhook endpoint information',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Webhook endpoint ID to update'
            },
            url: {
              type: 'string',
              description: 'New endpoint URL',
              format: 'uri'
            },
            description: {
              type: 'string',
              description: 'New description',
              maxLength: 255
            },
            events: {
              type: 'array',
              description: 'New events to listen for',
              items: {
                type: 'string',
                enum: [
                  'charge.create', 'charge.complete', 'charge.reverse',
                  'customer.create', 'customer.update', 'customer.destroy',
                  'card.create', 'card.update', 'card.destroy',
                  'transfer.create', 'transfer.update', 'transfer.destroy',
                  'recipient.create', 'recipient.update', 'recipient.destroy',
                  'refund.create', 'refund.destroy',
                  'dispute.create', 'dispute.update', 'dispute.accept',
                  'schedule.create', 'schedule.destroy',
                  'link.create', 'link.destroy'
                ]
              }
            },
            secret_key: {
              type: 'string',
              description: 'New secret key for signature verification',
              minLength: 16,
              maxLength: 64
            },
            metadata: {
              type: 'object',
              description: 'New metadata for the endpoint',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['endpoint_id']
        }
      },
      {
        name: 'webhook_endpoint_destroy',
        description: 'Delete a webhook endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Webhook endpoint ID to delete'
            },
            confirm: {
              type: 'boolean',
              description: 'Confirmation flag to prevent accidental deletion',
              default: false
            }
          },
          required: ['endpoint_id']
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  private validateEndpointId(endpointId: string): boolean {
    // Omise webhook endpoint ID format:
    // Test: wbhk_test_xxxxxxxxxxxxxxxx (19 chars after test_)
    // Production: wbhk_xxxxxxxxxxxxxxxx (19 chars after wbhk_)
    return /^wbhk_(test_[a-zA-Z0-9]{19}|[a-zA-Z0-9]{19})$/.test(endpointId);
  }

  private validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  private validateEvents(events: string[]): { valid: boolean; error?: string } {
    const validEvents = [
      'charge.create', 'charge.complete', 'charge.reverse',
      'customer.create', 'customer.update', 'customer.destroy',
      'card.create', 'card.update', 'card.destroy',
      'transfer.create', 'transfer.update', 'transfer.destroy',
      'recipient.create', 'recipient.update', 'recipient.destroy',
      'refund.create', 'refund.destroy',
      'dispute.create', 'dispute.update', 'dispute.accept',
      'schedule.create', 'schedule.destroy',
      'link.create', 'link.destroy'
    ];

    for (const event of events) {
      if (!validEvents.includes(event)) {
        return { valid: false, error: `Invalid event type: ${event}` };
      }
    }

    return { valid: true };
  }

  private validateSecretKey(secretKey: string): boolean {
    // Secret key must be 16-64 alphanumeric characters
    return /^[a-zA-Z0-9]{16,64}$/.test(secretKey);
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
  // Webhook Signature Verification
  // ============================================================================

  public verifyWebhookSignature(payload: string, signature: string, secretKey: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payload, 'utf8')
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error as Error);
      return false;
    }
  }

  public generateWebhookSignature(payload: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey)
      .update(payload, 'utf8')
      .digest('hex');
  }

  // ============================================================================
  // Endpoint Health Check
  // ============================================================================

  public async checkEndpointHealth(url: string): Promise<{ healthy: boolean; responseTime?: number; error?: string }> {
    try {
      const startTime = Date.now();
      
      // Note: fetch doesn't support timeout natively, use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Omise-Webhook-Health-Check/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return { healthy: true, responseTime };
      } else {
        return { healthy: false, responseTime, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // ============================================================================
  // Tool Implementation
  // ============================================================================

  async listWebhookEndpoints(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing webhook endpoints via MCP tool', params);

      // Parameter validation and default value setting
      const queryParams = {
        limit: Math.min(params.limit || 20, 100),
        offset: Math.max(params.offset || 0, 0),
        order: params.order || 'chronological',
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.status && { status: params.status })
      };

      const endpoints = await this.omiseClient.get<OmiseListResponse<OmiseWebhookEndpoint>>('/webhook_endpoints', queryParams);

      return {
        success: true,
        data: endpoints,
        message: `Retrieved ${endpoints.data.length} webhook endpoints (total: ${endpoints.total})`
      };
    } catch (error) {
      this.logger.error('Failed to list webhook endpoints via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async createWebhookEndpoint(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating webhook endpoint via MCP tool', { url: params.url, events: params.events });

      // Validation
      if (!this.validateUrl(params.url)) {
        return {
          success: false,
          error: 'Invalid URL format. Must be a valid HTTP or HTTPS URL.'
        };
      }

      const eventsValidation = this.validateEvents(params.events);
      if (!eventsValidation.valid) {
        return {
          success: false,
          error: eventsValidation.error
        };
      }

      if (params.secret_key && !this.validateSecretKey(params.secret_key)) {
        return {
          success: false,
          error: 'Invalid secret key format. Must be 16-64 alphanumeric characters.'
        };
      }

      // Endpoint health check
      const healthCheck = await this.checkEndpointHealth(params.url);
      if (!healthCheck.healthy) {
        this.logger.warn('Webhook endpoint health check failed', { url: params.url, error: healthCheck.error });
      }

      const endpointParams: CreateWebhookEndpointRequest = {
        url: params.url,
        description: params.description,
        events: params.events,
        secret_key: params.secret_key,
        metadata: this.sanitizeMetadata(params.metadata)
      };

      const endpoint = await this.omiseClient.post<OmiseWebhookEndpoint>('/webhook_endpoints', endpointParams);

      return {
        success: true,
        data: endpoint,
        message: `Webhook endpoint created successfully with ID: ${endpoint.id}`
      };
    } catch (error) {
      this.logger.error('Failed to create webhook endpoint via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveWebhookEndpoint(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving webhook endpoint via MCP tool', { endpointId: params.endpoint_id });

      if (!this.validateEndpointId(params.endpoint_id)) {
        return {
          success: false,
          error: 'Invalid endpoint ID format. Must be in format: wbhk_xxxxxxxxxxxxxxxx'
        };
      }

      const endpoint = await this.omiseClient.get<OmiseWebhookEndpoint>(`/webhook_endpoints/${params.endpoint_id}`);

      return {
        success: true,
        data: endpoint,
        message: `Webhook endpoint retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve webhook endpoint via MCP tool', error as Error, { endpointId: params.endpoint_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateWebhookEndpoint(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Updating webhook endpoint via MCP tool', { endpointId: params.endpoint_id });

      if (!this.validateEndpointId(params.endpoint_id)) {
        return {
          success: false,
          error: 'Invalid endpoint ID format. Must be in format: wbhk_xxxxxxxxxxxxxxxx'
        };
      }

      if (params.url && !this.validateUrl(params.url)) {
        return {
          success: false,
          error: 'Invalid URL format. Must be a valid HTTP or HTTPS URL.'
        };
      }

      if (params.events) {
        const eventsValidation = this.validateEvents(params.events);
        if (!eventsValidation.valid) {
          return {
            success: false,
            error: eventsValidation.error
          };
        }
      }

      if (params.secret_key && !this.validateSecretKey(params.secret_key)) {
        return {
          success: false,
          error: 'Invalid secret key format. Must be 16-64 alphanumeric characters.'
        };
      }

      // Health check when URL is updated
      if (params.url) {
        const healthCheck = await this.checkEndpointHealth(params.url);
        if (!healthCheck.healthy) {
          this.logger.warn('Webhook endpoint health check failed', { url: params.url, error: healthCheck.error });
        }
      }

      const updateData: UpdateWebhookEndpointRequest = {};
      if (params.url !== undefined) updateData.url = params.url;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.events !== undefined) updateData.events = params.events;
      if (params.secret_key !== undefined) updateData.secret_key = params.secret_key;
      if (params.metadata !== undefined) updateData.metadata = this.sanitizeMetadata(params.metadata);

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No update data provided. Please provide url, description, events, secret_key, or metadata to update.'
        };
      }

      const endpoint = await this.omiseClient.put<OmiseWebhookEndpoint>(`/webhook_endpoints/${params.endpoint_id}`, updateData);

      return {
        success: true,
        data: endpoint,
        message: `Webhook endpoint updated successfully`
      };
    } catch (error) {
      this.logger.error('Failed to update webhook endpoint via MCP tool', error as Error, { endpointId: params.endpoint_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async destroyWebhookEndpoint(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Destroying webhook endpoint via MCP tool', { endpointId: params.endpoint_id });

      if (!this.validateEndpointId(params.endpoint_id)) {
        return {
          success: false,
          error: 'Invalid endpoint ID format. Must be in format: wbhk_xxxxxxxxxxxxxxxx'
        };
      }

      if (!params.confirm) {
        return {
          success: false,
          error: 'Webhook endpoint deletion requires confirmation. Set confirm=true to proceed.'
        };
      }

      const endpoint = await this.omiseClient.delete<OmiseWebhookEndpoint>(`/webhook_endpoints/${params.endpoint_id}`);

      return {
        success: true,
        data: endpoint,
        message: `Webhook endpoint deleted successfully`
      };
    } catch (error) {
      this.logger.error('Failed to destroy webhook endpoint via MCP tool', error as Error, { endpointId: params.endpoint_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
