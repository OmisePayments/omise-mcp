/**
 * Schedule-related MCP Tools
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
  CreateScheduleRequest, 
  OmiseSchedule,
  OmiseScheduleOccurrence,
  OmiseListResponse,
  OmiseMetadata 
} from '../types/omise.js';

export class ScheduleTools {
  private omiseClient: OmiseClient;
  private logger: Logger;

  constructor(omiseClient: OmiseClient, logger: Logger) {
    this.omiseClient = omiseClient;
    this.logger = logger;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_schedule',
        description: 'Create a new payment schedule',
        inputSchema: {
          type: 'object',
          properties: {
            every: {
              type: 'number',
              description: 'Interval number for the schedule',
              minimum: 1
            },
            period: {
              type: 'string',
              description: 'Schedule period',
              enum: ['day', 'week', 'month', 'year'],
              default: 'month'
            },
            start_date: {
              type: 'string',
              description: 'Start date for the schedule (ISO 8601 format)',
              format: 'date-time'
            },
            end_date: {
              type: 'string',
              description: 'End date for the schedule (ISO 8601 format)',
              format: 'date-time'
            },
            on: {
              type: 'object',
              description: 'Specific day/time configuration for the schedule',
              properties: {
                weekdays: {
                  type: 'array',
                  description: 'Days of the week (0=Sunday, 1=Monday, etc.)',
                  items: {
                    type: 'number',
                    minimum: 0,
                    maximum: 6
                  }
                },
                days_of_month: {
                  type: 'array',
                  description: 'Days of the month (1-31)',
                  items: {
                    type: 'number',
                    minimum: 1,
                    maximum: 31
                  }
                },
                weekdays_of_month: {
                  type: 'string',
                  description: 'Weekday of month (first, second, third, fourth, last)',
                  enum: ['first', 'second', 'third', 'fourth', 'last']
                },
                weekdays_of_month_day: {
                  type: 'number',
                  description: 'Day of week for weekdays_of_month (0=Sunday, 1=Monday, etc.)',
                  minimum: 0,
                  maximum: 6
                }
              }
            },
            charge: {
              type: 'object',
              description: 'Charge configuration for the schedule',
              properties: {
                customer: {
                  type: 'string',
                  description: 'Customer ID for the charge'
                },
                card: {
                  type: 'string',
                  description: 'Card token for the charge'
                },
                amount: {
                  type: 'number',
                  description: 'Charge amount in the smallest currency unit',
                  minimum: 1
                },
                currency: {
                  type: 'string',
                  description: 'Currency code (THB, USD, etc.)',
                  pattern: '^[A-Z]{3}$'
                },
                description: {
                  type: 'string',
                  description: 'Charge description',
                  maxLength: 255
                },
                metadata: {
                  type: 'object',
                  description: 'Charge metadata',
                  additionalProperties: {
                    type: 'string'
                  }
                }
              },
              required: ['customer', 'amount', 'currency']
            },
            timezone: {
              type: 'string',
              description: 'Timezone for the schedule (e.g., Asia/Tokyo, America/New_York)',
              default: 'Asia/Tokyo'
            },
            description: {
              type: 'string',
              description: 'Schedule description',
              maxLength: 255
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata for the schedule',
              additionalProperties: {
                type: 'string'
              }
            }
          },
          required: ['every', 'period', 'start_date', 'charge']
        }
      },
      {
        name: 'retrieve_schedule',
        description: 'Retrieve schedule information by ID',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_id: {
              type: 'string',
              description: 'Schedule ID to retrieve'
            }
          },
          required: ['schedule_id']
        }
      },
      {
        name: 'list_schedules',
        description: 'List all schedules with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of schedules to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of schedules to skip (default: 0)',
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
              description: 'Filter by schedule status',
              enum: ['active', 'expiring', 'expired', 'deleted']
            },
            customer: {
              type: 'string',
              description: 'Filter by customer ID'
            }
          }
        }
      },
      {
        name: 'destroy_schedule',
        description: 'Delete a schedule',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_id: {
              type: 'string',
              description: 'Schedule ID to delete'
            },
            confirm: {
              type: 'boolean',
              description: 'Confirmation flag to prevent accidental deletion',
              default: false
            }
          },
          required: ['schedule_id']
        }
      },
      {
        name: 'list_schedule_occurrences',
        description: 'List all occurrences (execution history) for a schedule',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_id: {
              type: 'string',
              description: 'Schedule ID to list occurrences for'
            },
            limit: {
              type: 'number',
              description: 'Number of occurrences to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of occurrences to skip (default: 0)',
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
              description: 'Filter by occurrence status',
              enum: ['successful', 'failed', 'skipped']
            }
          },
          required: ['schedule_id']
        }
      }
    ];
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  private validateScheduleId(scheduleId: string): boolean {
    // Omise schedule ID format:
    // Test: schd_test_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    // Production: schd_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    return /^schd_(test_)?[0-9a-z]{19}$/.test(scheduleId);
  }

  private validateCustomerId(customerId: string): boolean {
    // Omise customer ID format:
    // Test: cust_test_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    // Production: cust_xxxxxxxxxxxxxxxx (19 lowercase alphanumeric chars)
    return /^cust_(test_)?[0-9a-z]{19}$/.test(customerId);
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

  private validateTimezone(timezone: string): boolean {
    try {
      // Check timezone validity
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private validateScheduleDates(startDate: string, endDate?: string): { valid: boolean; error?: string } {
    const start = new Date(startDate);
    const now = new Date();
    
    // Start date must be in the future
    if (start <= now) {
      return { valid: false, error: 'Start date must be in the future' };
    }
    
    if (endDate) {
      const end = new Date(endDate);
      
      // End date must be after start date
      if (end <= start) {
        return { valid: false, error: 'End date must be after start date' };
      }
      
      // End date must be within 1 year
      const oneYearFromStart = new Date(start);
      oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);
      if (end > oneYearFromStart) {
        return { valid: false, error: 'End date must be within one year from start date' };
      }
    }
    
    return { valid: true };
  }

  private validateSchedulePeriod(period: string, every: number): { valid: boolean; error?: string } {
    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period)) {
      return { valid: false, error: 'Invalid period. Must be one of: day, week, month, year' };
    }
    
    // Check maximum interval by period
    const maxIntervals: { [key: string]: number } = {
      'day': 365,
      'week': 52,
      'month': 12,
      'year': 1
    };
    
    const maxInterval = maxIntervals[period];
    if (maxInterval && every > maxInterval) {
      return { valid: false, error: `Invalid interval for ${period} period. Maximum: ${maxInterval}` };
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

  async createSchedule(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Creating schedule via MCP tool', { 
        period: params.period, 
        every: params.every,
        startDate: params.start_date 
      });

      // Validation
      const periodValidation = this.validateSchedulePeriod(params.period, params.every);
      if (!periodValidation.valid) {
        return {
          success: false,
          error: periodValidation.error
        };
      }

      const dateValidation = this.validateScheduleDates(params.start_date, params.end_date);
      if (!dateValidation.valid) {
        return {
          success: false,
          error: dateValidation.error
        };
      }

      if (params.timezone && !this.validateTimezone(params.timezone)) {
        return {
          success: false,
          error: 'Invalid timezone. Please use a valid IANA timezone identifier.'
        };
      }

      if (!this.validateCustomerId(params.charge.customer)) {
        return {
          success: false,
          error: 'Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx'
        };
      }

      if (!this.validateCurrency(params.charge.currency)) {
        return {
          success: false,
          error: `Invalid currency code: ${params.charge.currency}. Must be a valid 3-letter currency code.`
        };
      }

      if (!this.validateAmount(params.charge.amount, params.charge.currency)) {
        return {
          success: false,
          error: `Invalid amount: ${params.charge.amount}. Amount must be positive and meet minimum requirements for ${params.charge.currency}.`
        };
      }

      const scheduleParams: CreateScheduleRequest = {
        every: params.every,
        period: params.period,
        start_date: params.start_date,
        end_date: params.end_date,
        on: params.on,
        charge: {
          customer: params.charge.customer,
          amount: params.charge.amount,
          currency: params.charge.currency.toUpperCase(),
          description: params.charge.description,
          metadata: this.sanitizeMetadata(params.charge.metadata),
          ...(params.charge.card && { card: params.charge.card })
        },
        timezone: params.timezone || 'Asia/Tokyo',
        description: params.description,
        metadata: this.sanitizeMetadata(params.metadata)
      };

      const schedule = await this.omiseClient.post<OmiseSchedule>('/schedules', scheduleParams);

      return {
        success: true,
        data: schedule,
        message: `Schedule created successfully with ID: ${schedule.id}`
      };
    } catch (error) {
      this.logger.error('Failed to create schedule via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retrieveSchedule(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Retrieving schedule via MCP tool', { scheduleId: params.schedule_id });

      if (!this.validateScheduleId(params.schedule_id)) {
        return {
          success: false,
          error: 'Invalid schedule ID format. Must be in format: schd_xxxxxxxxxxxxxxxx'
        };
      }

      const schedule = await this.omiseClient.get<OmiseSchedule>(`/schedules/${params.schedule_id}`);

      return {
        success: true,
        data: schedule,
        message: `Schedule retrieved successfully`
      };
    } catch (error) {
      this.logger.error('Failed to retrieve schedule via MCP tool', error as Error, { scheduleId: params.schedule_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async listSchedules(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing schedules via MCP tool', params);

      // Parameter validation and default value setting
      const queryParams = {
        limit: Math.min(params.limit || 20, 100),
        offset: Math.max(params.offset || 0, 0),
        order: params.order || 'chronological',
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.status && { status: params.status }),
        ...(params.customer && { customer: params.customer })
      };

      const schedules = await this.omiseClient.get<OmiseListResponse<OmiseSchedule>>('/schedules', queryParams);

      return {
        success: true,
        data: schedules,
        message: `Retrieved ${schedules.data.length} schedules (total: ${schedules.total})`
      };
    } catch (error) {
      this.logger.error('Failed to list schedules via MCP tool', error as Error, params);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async destroySchedule(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Destroying schedule via MCP tool', { scheduleId: params.schedule_id });

      if (!this.validateScheduleId(params.schedule_id)) {
        return {
          success: false,
          error: 'Invalid schedule ID format. Must be in format: schd_xxxxxxxxxxxxxxxx'
        };
      }

      if (!params.confirm) {
        return {
          success: false,
          error: 'Schedule deletion requires confirmation. Set confirm=true to proceed.'
        };
      }

      const schedule = await this.omiseClient.delete<OmiseSchedule>(`/schedules/${params.schedule_id}`);

      return {
        success: true,
        data: schedule,
        message: `Schedule deleted successfully`
      };
    } catch (error) {
      this.logger.error('Failed to destroy schedule via MCP tool', error as Error, { scheduleId: params.schedule_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async listScheduleOccurrences(params: any): Promise<ToolResult> {
    try {
      this.logger.info('Listing schedule occurrences via MCP tool', { scheduleId: params.schedule_id });

      if (!this.validateScheduleId(params.schedule_id)) {
        return {
          success: false,
          error: 'Invalid schedule ID format. Must be in format: schd_xxxxxxxxxxxxxxxx'
        };
      }

      // Parameter validation and default value setting
      const queryParams = {
        limit: Math.min(params.limit || 20, 100),
        offset: Math.max(params.offset || 0, 0),
        order: params.order || 'chronological',
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.status && { status: params.status })
      };

      const occurrences = await this.omiseClient.get<OmiseListResponse<OmiseScheduleOccurrence>>(`/schedules/${params.schedule_id}/occurrences`, queryParams);

      return {
        success: true,
        data: occurrences,
        message: `Retrieved ${occurrences.data.length} schedule occurrences (total: ${occurrences.total})`
      };
    } catch (error) {
      this.logger.error('Failed to list schedule occurrences via MCP tool', error as Error, { scheduleId: params.schedule_id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
