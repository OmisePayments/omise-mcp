/**
 * Schedule Tools Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ScheduleTools } from '../../src/tools/schedule-tools';
import { OmiseClient } from '../../src/utils/omise-client';
import { Logger } from '../../src/utils/logger';
import { createMockSchedule, createMockCharge } from '../factories';
import type { OmiseSchedule, OmiseScheduleOccurrence, OmiseListResponse } from '../../src/types/omise';

// Mock setup
jest.mock('../../src/utils/omise-client');
jest.mock('../../src/utils/logger');

describe('ScheduleTools', () => {
  let scheduleTools: ScheduleTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    scheduleTools = new ScheduleTools(mockOmiseClient, mockLogger);
  });

  // ============================================================================
  // Tool Definition Tests
  // ============================================================================

  describe('getTools', () => {
    it('should return correct tool definitions', () => {
      const tools = scheduleTools.getTools();

      expect(tools).toHaveLength(5);
      
      // Check create_schedule tool
      expect(tools[0]).toEqual({
        name: 'create_schedule',
        description: 'Create a new payment schedule',
        inputSchema: {
          type: 'object',
          properties: expect.objectContaining({
            every: expect.objectContaining({
              type: 'number',
              description: 'Interval number for the schedule',
              minimum: 1
            }),
            period: expect.objectContaining({
              type: 'string',
              description: 'Schedule period',
              enum: ['day', 'week', 'month', 'year'],
              default: 'month'
            }),
            start_date: expect.objectContaining({
              type: 'string',
              description: 'Start date for the schedule (ISO 8601 format)',
              format: 'date-time'
            }),
            charge: expect.objectContaining({
              type: 'object',
              description: 'Charge configuration for the schedule',
              required: ['customer', 'amount', 'currency']
            })
          }),
          required: ['every', 'period', 'start_date', 'charge']
        }
      });

      // Check retrieve_schedule tool
      expect(tools[1]).toEqual({
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
      });

      // Check list_schedules tool
      expect(tools[2]).toEqual({
        name: 'list_schedules',
        description: 'List all schedules with optional filtering',
        inputSchema: {
          type: 'object',
          properties: expect.objectContaining({
            limit: expect.objectContaining({
              type: 'number',
              description: 'Number of schedules to retrieve (default: 20, max: 100)',
              minimum: 1,
              maximum: 100,
              default: 20
            }),
            offset: expect.objectContaining({
              type: 'number',
              description: 'Number of schedules to skip (default: 0)',
              minimum: 0,
              default: 0
            })
          })
        }
      });

      // Check destroy_schedule tool
      expect(tools[3]).toEqual({
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
      });

      // Check list_schedule_occurrences tool
      expect(tools[4]).toEqual({
        name: 'list_schedule_occurrences',
        description: 'List all occurrences (execution history) for a schedule',
        inputSchema: {
          type: 'object',
          properties: expect.objectContaining({
            schedule_id: {
              type: 'string',
              description: 'Schedule ID to list occurrences for'
            }
          }),
          required: ['schedule_id']
        }
      });
    });
  });

  // ============================================================================
  // Main Tool Implementation Tests
  // ============================================================================

  describe('createSchedule', () => {
    it('should create a schedule successfully', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB',
          description: 'Monthly subscription'
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchedule);
      expect(result.message).toContain('Schedule created successfully');
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: expect.objectContaining({
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        })
      }));
      expect(mockLogger.info).toHaveBeenCalledWith('Creating schedule via MCP tool', {
        period: 'month',
        every: 1,
        startDate: futureDate.toISOString()
      });
    });

    it('should create a schedule with all optional parameters', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const params = {
        every: 2,
        period: 'week',
        start_date: futureDate.toISOString(),
        end_date: endDate.toISOString(),
        on: {
          weekdays: [1, 3, 5] // Monday, Wednesday, Friday
        },
        charge: {
          customer: 'cust_test_1234567890123456789',
          card: 'card_test_1234567890123456',
          amount: 50000,
          currency: 'USD',
          description: 'Bi-weekly payment',
          metadata: { source: 'web' }
        },
        timezone: 'America/New_York',
        description: 'Bi-weekly subscription',
        metadata: { category: 'subscription' }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        every: 2,
        period: 'week',
        start_date: futureDate.toISOString(),
        end_date: endDate.toISOString(),
        on: { weekdays: [1, 3, 5] },
        charge: expect.objectContaining({
          customer: 'cust_test_1234567890123456789',
          card: 'card_test_1234567890123456',
          amount: 50000,
          currency: 'USD',
          description: 'Bi-weekly payment',
          metadata: { source: 'web' }
        }),
        timezone: 'America/New_York',
        description: 'Bi-weekly subscription',
        metadata: { category: 'subscription' }
      }));
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }
      };
      const apiError = new Error('API connection failed');
      mockOmiseClient.post.mockRejectedValue(apiError);

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create schedule via MCP tool', apiError, params);
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }
      };
      mockOmiseClient.post.mockRejectedValue('Unknown error');

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should validate timezone when provided', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        timezone: 'Invalid/Timezone',
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }
      };

      const result = await scheduleTools.createSchedule(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid timezone. Please use a valid IANA timezone identifier.');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should validate customer ID format', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'invalid_customer_id',
          amount: 100000,
          currency: 'THB'
        }
      };

      const result = await scheduleTools.createSchedule(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid customer ID format. Must be in format: cust_xxxxxxxxxxxxxxxx');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should validate currency code', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'INVALID'
        }
      };

      const result = await scheduleTools.createSchedule(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid currency code: INVALID. Must be a valid 3-letter currency code.');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should validate amount', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 0,
          currency: 'THB'
        }
      };

      const result = await scheduleTools.createSchedule(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid amount: 0. Amount must be positive and meet minimum requirements for THB.');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });
  });

  describe('retrieveSchedule', () => {
    it('should retrieve a schedule successfully', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.get.mockResolvedValue(mockSchedule);

      const params = {
        schedule_id: 'schd_test_1234567890123456789'
      };

      // Act
      const result = await scheduleTools.retrieveSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchedule);
      expect(result.message).toContain('Schedule retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules/schd_test_1234567890123456789');
      expect(mockLogger.info).toHaveBeenCalledWith('Retrieving schedule via MCP tool', { scheduleId: 'schd_test_1234567890123456789' });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const params = {
        schedule_id: 'schd_test_1234567890123456789'
      };
      const apiError = new Error('Schedule not found');
      mockOmiseClient.get.mockRejectedValue(apiError);

      // Act
      const result = await scheduleTools.retrieveSchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Schedule not found');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to retrieve schedule via MCP tool', apiError, { scheduleId: 'schd_test_1234567890123456789' });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const params = {
        schedule_id: 'schd_test_1234567890123456789'
      };
      mockOmiseClient.get.mockRejectedValue('Unknown error');

      // Act
      const result = await scheduleTools.retrieveSchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should validate schedule ID format', async () => {
      const params = {
        schedule_id: 'invalid_id'
      };

      const result = await scheduleTools.retrieveSchedule(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid schedule ID format. Must be in format: schd_xxxxxxxxxxxxxxxx');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });
  });

  describe('listSchedules', () => {
    it('should list schedules successfully with default parameters', async () => {
      // Arrange
      const mockSchedules: OmiseListResponse<OmiseSchedule> = {
        object: 'list',
        data: [createMockSchedule(), createMockSchedule()],
        limit: 20,
        offset: 0,
        total: 2,
        location: '/schedules',
        order: 'chronological'
      };
      mockOmiseClient.get.mockResolvedValue(mockSchedules);

      const params = {};

      // Act
      const result = await scheduleTools.listSchedules(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchedules);
      expect(result.message).toContain('Retrieved 2 schedules (total: 2)');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Listing schedules via MCP tool', params);
    });

    it('should list schedules with custom parameters', async () => {
      // Arrange
      const mockSchedules: OmiseListResponse<OmiseSchedule> = {
        object: 'list',
        data: [createMockSchedule()],
        limit: 10,
        offset: 20,
        total: 1,
        location: '/schedules',
        order: 'reverse_chronological'
      };
      mockOmiseClient.get.mockResolvedValue(mockSchedules);

      const params = {
        limit: 10,
        offset: 20,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        status: 'active',
        customer: 'cust_test_1234567890123456789'
      };

      // Act
      const result = await scheduleTools.listSchedules(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules', {
        limit: 10,
        offset: 20,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        status: 'active',
        customer: 'cust_test_1234567890123456789'
      });
    });

    it('should enforce maximum limit', async () => {
      // Arrange
      const mockSchedules: OmiseListResponse<OmiseSchedule> = {
        object: 'list',
        data: [],
        limit: 100,
        offset: 0,
        total: 0,
        location: '/schedules',
        order: 'chronological'
      };
      mockOmiseClient.get.mockResolvedValue(mockSchedules);

      const params = {
        limit: 150 // Should be capped at 100
      };

      // Act
      const result = await scheduleTools.listSchedules(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        limit: 100 // Should be capped
      }));
    });

    it('should enforce minimum offset', async () => {
      // Arrange
      const mockSchedules: OmiseListResponse<OmiseSchedule> = {
        object: 'list',
        data: [],
        limit: 20,
        offset: 0,
        total: 0,
        location: '/schedules',
        order: 'chronological'
      };
      mockOmiseClient.get.mockResolvedValue(mockSchedules);

      const params = {
        offset: -10 // Should be set to 0
      };

      // Act
      const result = await scheduleTools.listSchedules(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        offset: 0 // Should be set to 0
      }));
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const params = {};
      const apiError = new Error('API connection failed');
      mockOmiseClient.get.mockRejectedValue(apiError);

      // Act
      const result = await scheduleTools.listSchedules(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to list schedules via MCP tool', apiError, params);
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const params = {};
      mockOmiseClient.get.mockRejectedValue('Unknown error');

      // Act
      const result = await scheduleTools.listSchedules(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('destroySchedule', () => {
    it('should destroy a schedule successfully with confirmation', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.delete.mockResolvedValue(mockSchedule);

      const params = {
        schedule_id: 'schd_test_1234567890123456789',
        confirm: true
      };

      // Act
      const result = await scheduleTools.destroySchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSchedule);
      expect(result.message).toContain('Schedule deleted successfully');
      expect(mockOmiseClient.delete).toHaveBeenCalledWith('/schedules/schd_test_1234567890123456789');
      expect(mockLogger.info).toHaveBeenCalledWith('Destroying schedule via MCP tool', { scheduleId: 'schd_test_1234567890123456789' });
    });

    it('should require confirmation to destroy schedule', async () => {
      // Arrange
      const params = {
        schedule_id: 'schd_test_1234567890123456789',
        confirm: false
      };

      // Act
      const result = await scheduleTools.destroySchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Schedule deletion requires confirmation. Set confirm=true to proceed.');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should require confirmation when confirm is undefined', async () => {
      // Arrange
      const params = {
        schedule_id: 'schd_test_1234567890123456789'
      };

      // Act
      const result = await scheduleTools.destroySchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Schedule deletion requires confirmation. Set confirm=true to proceed.');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const params = {
        schedule_id: 'schd_test_1234567890123456789',
        confirm: true
      };
      const apiError = new Error('Schedule not found');
      mockOmiseClient.delete.mockRejectedValue(apiError);

      // Act
      const result = await scheduleTools.destroySchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Schedule not found');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to destroy schedule via MCP tool', apiError, { scheduleId: 'schd_test_1234567890123456789' });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const params = {
        schedule_id: 'schd_test_1234567890123456789',
        confirm: true
      };
      mockOmiseClient.delete.mockRejectedValue('Unknown error');

      // Act
      const result = await scheduleTools.destroySchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should validate schedule ID format', async () => {
      const params = {
        schedule_id: 'invalid_id',
        confirm: true
      };

      const result = await scheduleTools.destroySchedule(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid schedule ID format. Must be in format: schd_xxxxxxxxxxxxxxxx');
      expect(mockOmiseClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('listScheduleOccurrences', () => {
    it('should list schedule occurrences successfully with default parameters', async () => {
      // Arrange
      const mockOccurrences: OmiseListResponse<OmiseScheduleOccurrence> = {
        object: 'list',
        data: [
          {
            object: 'occurrence',
            id: 'occr_test_1234567890123456',
            livemode: false,
            location: '/schedules/schd_test_1234567890123456789/occurrences/occr_test_1234567890123456',
            created: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            processed_at: '2024-01-01T00:00:00Z',
            scheduled_on: '2024-01-01',
            status: 'successful',
            retry_date: undefined,
            schedule: 'schd_test_1234567890123456789'
          }
        ],
        limit: 20,
        offset: 0,
        total: 1,
        location: '/schedules/schd_test_1234567890123456789/occurrences',
        order: 'chronological'
      };
      mockOmiseClient.get.mockResolvedValue(mockOccurrences);

      const params = {
        schedule_id: 'schd_test_1234567890123456789'
      };

      // Act
      const result = await scheduleTools.listScheduleOccurrences(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOccurrences);
      expect(result.message).toContain('Retrieved 1 schedule occurrences (total: 1)');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules/schd_test_1234567890123456789/occurrences', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Listing schedule occurrences via MCP tool', { scheduleId: 'schd_test_1234567890123456789' });
    });

    it('should list schedule occurrences with custom parameters', async () => {
      // Arrange
      const mockOccurrences: OmiseListResponse<OmiseScheduleOccurrence> = {
        object: 'list',
        data: [],
        limit: 10,
        offset: 20,
        total: 0,
        location: '/schedules/schd_test_1234567890123456789/occurrences',
        order: 'reverse_chronological'
      };
      mockOmiseClient.get.mockResolvedValue(mockOccurrences);

      const params = {
        schedule_id: 'schd_test_1234567890123456789',
        limit: 10,
        offset: 20,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        status: 'successful'
      };

      // Act
      const result = await scheduleTools.listScheduleOccurrences(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules/schd_test_1234567890123456789/occurrences', {
        limit: 10,
        offset: 20,
        order: 'reverse_chronological',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
        status: 'successful'
      });
    });

    it('should enforce maximum limit', async () => {
      // Arrange
      const mockOccurrences: OmiseListResponse<OmiseScheduleOccurrence> = {
        object: 'list',
        data: [],
        limit: 100,
        offset: 0,
        total: 0,
        location: '/schedules/schd_test_1234567890123456789/occurrences',
        order: 'chronological'
      };
      mockOmiseClient.get.mockResolvedValue(mockOccurrences);

      const params = {
        schedule_id: 'schd_test_1234567890123456789',
        limit: 150 // Should be capped at 100
      };

      // Act
      const result = await scheduleTools.listScheduleOccurrences(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules/schd_test_1234567890123456789/occurrences', expect.objectContaining({
        limit: 100 // Should be capped
      }));
    });

    it('should enforce minimum offset', async () => {
      // Arrange
      const mockOccurrences: OmiseListResponse<OmiseScheduleOccurrence> = {
        object: 'list',
        data: [],
        limit: 20,
        offset: 0,
        total: 0,
        location: '/schedules/schd_test_1234567890123456789/occurrences',
        order: 'chronological'
      };
      mockOmiseClient.get.mockResolvedValue(mockOccurrences);

      const params = {
        schedule_id: 'schd_test_1234567890123456789',
        offset: -10 // Should be set to 0
      };

      // Act
      const result = await scheduleTools.listScheduleOccurrences(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/schedules/schd_test_1234567890123456789/occurrences', expect.objectContaining({
        offset: 0 // Should be set to 0
      }));
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const params = {
        schedule_id: 'schd_test_1234567890123456789'
      };
      const apiError = new Error('Schedule not found');
      mockOmiseClient.get.mockRejectedValue(apiError);

      // Act
      const result = await scheduleTools.listScheduleOccurrences(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Schedule not found');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to list schedule occurrences via MCP tool', apiError, { scheduleId: 'schd_test_1234567890123456789' });
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const params = {
        schedule_id: 'schd_test_1234567890123456789'
      };
      mockOmiseClient.get.mockRejectedValue('Unknown error');

      // Act
      const result = await scheduleTools.listScheduleOccurrences(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should validate schedule ID format', async () => {
      const params = {
        schedule_id: 'invalid_id'
      };

      const result = await scheduleTools.listScheduleOccurrences(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid schedule ID format. Must be in format: schd_xxxxxxxxxxxxxxxx');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Validation Functions Tests
  // ============================================================================

  describe('validateScheduleId', () => {
    it('should validate correct test schedule ID', () => {
      const result = (scheduleTools as any).validateScheduleId('schd_test_1234567890123456789');
      expect(result).toBe(true);
    });

    it('should validate correct production schedule ID', () => {
      const result = (scheduleTools as any).validateScheduleId('schd_1234567890123456789');
      expect(result).toBe(true);
    });

    it('should reject invalid schedule ID format', () => {
      const result = (scheduleTools as any).validateScheduleId('invalid_id');
      expect(result).toBe(false);
    });

    it('should reject schedule ID with wrong prefix', () => {
      const result = (scheduleTools as any).validateScheduleId('cust_test_1234567890123456789');
      expect(result).toBe(false);
    });

    it('should reject schedule ID with uppercase characters', () => {
      const result = (scheduleTools as any).validateScheduleId('SCHD_TEST_1234567890123456');
      expect(result).toBe(false);
    });

    it('should reject schedule ID with wrong length', () => {
      const result = (scheduleTools as any).validateScheduleId('schd_test_123456789012345');
      expect(result).toBe(false);
    });
  });

  describe('validateCustomerId', () => {
    it('should validate correct test customer ID', () => {
      const result = (scheduleTools as any).validateCustomerId('cust_test_1234567890123456789');
      expect(result).toBe(true);
    });

    it('should validate correct production customer ID', () => {
      const result = (scheduleTools as any).validateCustomerId('cust_1234567890123456789');
      expect(result).toBe(true);
    });

    it('should reject invalid customer ID format', () => {
      const result = (scheduleTools as any).validateCustomerId('invalid_id');
      expect(result).toBe(false);
    });

    it('should reject customer ID with wrong prefix', () => {
      const result = (scheduleTools as any).validateCustomerId('schd_test_1234567890123456789');
      expect(result).toBe(false);
    });

    it('should reject customer ID with uppercase characters', () => {
      const result = (scheduleTools as any).validateCustomerId('CUST_TEST_1234567890123456');
      expect(result).toBe(false);
    });

    it('should reject customer ID with wrong length', () => {
      const result = (scheduleTools as any).validateCustomerId('cust_test_123456789012345');
      expect(result).toBe(false);
    });
  });

  describe('validateCurrency', () => {
    it('should validate supported currencies', () => {
      const supportedCurrencies = ['THB', 'USD', 'JPY', 'EUR', 'GBP', 'SGD', 'HKD', 'AUD', 'CAD', 'CHF', 'CNY'];
      
      supportedCurrencies.forEach(currency => {
        const result = (scheduleTools as any).validateCurrency(currency);
        expect(result).toBe(true);
      });
    });

    it('should validate currencies with different case', () => {
      expect((scheduleTools as any).validateCurrency('thb')).toBe(true);
      expect((scheduleTools as any).validateCurrency('usd')).toBe(true);
      expect((scheduleTools as any).validateCurrency('jpy')).toBe(true);
    });

    it('should reject unsupported currencies', () => {
      const unsupportedCurrencies = ['BTC', 'ETH', 'INVALID', 'XYZ'];
      
      unsupportedCurrencies.forEach(currency => {
        const result = (scheduleTools as any).validateCurrency(currency);
        expect(result).toBe(false);
      });
    });

    it('should reject empty currency', () => {
      const result = (scheduleTools as any).validateCurrency('');
      expect(result).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive amounts', () => {
      expect((scheduleTools as any).validateAmount(100, 'THB')).toBe(true);
      expect((scheduleTools as any).validateAmount(1, 'USD')).toBe(true);
      expect((scheduleTools as any).validateAmount(1000, 'JPY')).toBe(true);
    });

    it('should validate minimum amounts by currency', () => {
      expect((scheduleTools as any).validateAmount(1, 'THB')).toBe(true);
      expect((scheduleTools as any).validateAmount(1, 'USD')).toBe(true);
      expect((scheduleTools as any).validateAmount(1, 'JPY')).toBe(true);
    });

    it('should reject zero amounts', () => {
      expect((scheduleTools as any).validateAmount(0, 'THB')).toBe(false);
      expect((scheduleTools as any).validateAmount(0, 'USD')).toBe(false);
    });

    it('should reject negative amounts', () => {
      expect((scheduleTools as any).validateAmount(-100, 'THB')).toBe(false);
      expect((scheduleTools as any).validateAmount(-1, 'USD')).toBe(false);
    });

    it('should reject amounts below minimum', () => {
      expect((scheduleTools as any).validateAmount(0, 'THB')).toBe(false);
      expect((scheduleTools as any).validateAmount(0, 'USD')).toBe(false);
    });

    it('should handle unknown currencies with default minimum', () => {
      expect((scheduleTools as any).validateAmount(1, 'UNKNOWN')).toBe(true);
      expect((scheduleTools as any).validateAmount(0, 'UNKNOWN')).toBe(false);
    });
  });

  describe('validateTimezone', () => {
    it('should validate common timezones', () => {
      const validTimezones = [
        'Asia/Tokyo',
        'America/New_York',
        'Europe/London',
        'UTC',
        'Asia/Bangkok',
        'America/Los_Angeles'
      ];

      validTimezones.forEach(timezone => {
        const result = (scheduleTools as any).validateTimezone(timezone);
        expect(result).toBe(true);
      });
    });

    it('should reject invalid timezones', () => {
      const invalidTimezones = [
        'Invalid/Timezone',
        'NotATimezone',
        'Asia/InvalidCity',
        ''
      ];

      invalidTimezones.forEach(timezone => {
        const result = (scheduleTools as any).validateTimezone(timezone);
        expect(result).toBe(false);
      });
    });
  });

  describe('validateScheduleDates', () => {
    it('should validate future start date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const result = (scheduleTools as any).validateScheduleDates(futureDate.toISOString());
      expect(result.valid).toBe(true);
    });

    it('should reject past start date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const result = (scheduleTools as any).validateScheduleDates(pastDate.toISOString());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start date must be in the future');
    });

    it('should reject current start date', () => {
      const currentDate = new Date();
      
      const result = (scheduleTools as any).validateScheduleDates(currentDate.toISOString());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start date must be in the future');
    });

    it('should validate end date after start date', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const result = (scheduleTools as any).validateScheduleDates(startDate.toISOString(), endDate.toISOString());
      expect(result.valid).toBe(true);
    });

    it('should reject end date before start date', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
      
      const result = (scheduleTools as any).validateScheduleDates(startDate.toISOString(), endDate.toISOString());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });

    it('should reject end date equal to start date', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      
      const result = (scheduleTools as any).validateScheduleDates(startDate.toISOString(), startDate.toISOString());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });

    it('should reject end date more than one year from start date', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 2);
      
      const result = (scheduleTools as any).validateScheduleDates(startDate.toISOString(), endDate.toISOString());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('End date must be within one year from start date');
    });
  });

  describe('validateSchedulePeriod', () => {
    it('should validate correct periods', () => {
      const validPeriods = ['day', 'week', 'month', 'year'];
      
      validPeriods.forEach(period => {
        const result = (scheduleTools as any).validateSchedulePeriod(period, 1);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid periods', () => {
      const invalidPeriods = ['hour', 'minute', 'invalid', ''];
      
      invalidPeriods.forEach(period => {
        const result = (scheduleTools as any).validateSchedulePeriod(period, 1);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid period. Must be one of: day, week, month, year');
      });
    });

    it('should validate correct intervals for each period', () => {
      expect((scheduleTools as any).validateSchedulePeriod('day', 365).valid).toBe(true);
      expect((scheduleTools as any).validateSchedulePeriod('week', 52).valid).toBe(true);
      expect((scheduleTools as any).validateSchedulePeriod('month', 12).valid).toBe(true);
      expect((scheduleTools as any).validateSchedulePeriod('year', 1).valid).toBe(true);
    });

    it('should reject intervals exceeding maximum for each period', () => {
      expect((scheduleTools as any).validateSchedulePeriod('day', 366).valid).toBe(false);
      expect((scheduleTools as any).validateSchedulePeriod('week', 53).valid).toBe(false);
      expect((scheduleTools as any).validateSchedulePeriod('month', 13).valid).toBe(false);
      expect((scheduleTools as any).validateSchedulePeriod('year', 2).valid).toBe(false);
    });

    it('should provide correct error messages for invalid intervals', () => {
      const result = (scheduleTools as any).validateSchedulePeriod('day', 366);
      expect(result.error).toBe('Invalid interval for day period. Maximum: 365');
      
      const result2 = (scheduleTools as any).validateSchedulePeriod('month', 13);
      expect(result2.error).toBe('Invalid interval for month period. Maximum: 12');
    });
  });

  describe('sanitizeMetadata', () => {
    it('should sanitize valid metadata', () => {
      const metadata = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null
      };
      
      const result = (scheduleTools as any).sanitizeMetadata(metadata);
      expect(result).toEqual(metadata);
    });

    it('should filter out invalid metadata types', () => {
      const metadata = {
        string: 'test',
        number: 123,
        boolean: true,
        object: { nested: 'value' },
        array: [1, 2, 3],
        function: () => {},
        undefined: undefined
      };
      
      const result = (scheduleTools as any).sanitizeMetadata(metadata);
      expect(result).toEqual({
        string: 'test',
        number: 123,
        boolean: true
      });
    });

    it('should return undefined for empty metadata', () => {
      const metadata = {};
      
      const result = (scheduleTools as any).sanitizeMetadata(metadata);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-object metadata', () => {
      expect((scheduleTools as any).sanitizeMetadata('string')).toBeUndefined();
      expect((scheduleTools as any).sanitizeMetadata(123)).toBeUndefined();
      expect((scheduleTools as any).sanitizeMetadata(true)).toBeUndefined();
      expect((scheduleTools as any).sanitizeMetadata(null)).toBeUndefined();
      expect((scheduleTools as any).sanitizeMetadata(undefined)).toBeUndefined();
    });

    it('should handle metadata with only invalid types', () => {
      const metadata = {
        object: { nested: 'value' },
        array: [1, 2, 3],
        function: () => {}
      };
      
      const result = (scheduleTools as any).sanitizeMetadata(metadata);
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('createSchedule integration', () => {
    it('should validate all parameters before creating schedule', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB',
          description: 'Monthly subscription',
          metadata: { source: 'web', valid: true, number: 123 }
        },
        timezone: 'Asia/Tokyo',
        description: 'Test schedule',
        metadata: { category: 'subscription', count: 1 }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: expect.objectContaining({
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB',
          description: 'Monthly subscription',
          metadata: { source: 'web', valid: true, number: 123 }
        }),
        timezone: 'Asia/Tokyo',
        description: 'Test schedule',
        metadata: { category: 'subscription', count: 1 }
      }));
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'invalid_period',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid period. Must be one of: day, week, month, year');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });

    it('should handle multiple validation errors', async () => {
      // Arrange
      const params = {
        every: 1,
        period: 'month',
        start_date: '2020-01-01T00:00:00Z', // Past date
        charge: {
          customer: 'invalid_customer_id',
          amount: 0, // Invalid amount
          currency: 'INVALID_CURRENCY'
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Start date must be in the future');
      expect(mockOmiseClient.post).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle schedule creation with minimal required parameters', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: expect.objectContaining({
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }),
        timezone: 'Asia/Tokyo' // Default timezone
      }));
    });

    it('should handle schedule creation with complex on configuration', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        on: {
          weekdays: [1, 3, 5], // Monday, Wednesday, Friday
          days_of_month: [1, 15],
          weekdays_of_month: 'first',
          weekdays_of_month_day: 1 // Monday
        },
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        on: {
          weekdays: [1, 3, 5],
          days_of_month: [1, 15],
          weekdays_of_month: 'first',
          weekdays_of_month_day: 1
        }
      }));
    });

    it('should handle schedule creation with card token', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          card: 'card_test_1234567890123456',
          amount: 100000,
          currency: 'THB'
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        charge: expect.objectContaining({
          customer: 'cust_test_1234567890123456789',
          card: 'card_test_1234567890123456',
          amount: 100000,
          currency: 'THB'
        })
      }));
    });

    it('should handle schedule creation without card token', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        charge: expect.not.objectContaining({
          card: expect.anything()
        })
      }));
    });

    it('should handle schedule creation with different currencies', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const currencies = ['USD', 'JPY', 'EUR', 'GBP'];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      for (const currency of currencies) {
        const params = {
          every: 1,
          period: 'month',
          start_date: futureDate.toISOString(),
          charge: {
            customer: 'cust_test_1234567890123456789',
            amount: 100000,
            currency: currency.toLowerCase() // Test case insensitive
          }
        };

        // Act
        const result = await scheduleTools.createSchedule(params);

        // Assert
        expect(result.success).toBe(true);
        expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
          charge: expect.objectContaining({
            currency: currency.toUpperCase()
          })
        }));
      }
    });

    it('should handle schedule creation with maximum intervals', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const testCases = [
        { period: 'day', every: 365 },
        { period: 'week', every: 52 },
        { period: 'month', every: 12 },
        { period: 'year', every: 1 }
      ];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      for (const testCase of testCases) {
        const params = {
          every: testCase.every,
          period: testCase.period,
          start_date: futureDate.toISOString(),
          charge: {
            customer: 'cust_test_1234567890123456789',
            amount: 100000,
            currency: 'THB'
          }
        };

        // Act
        const result = await scheduleTools.createSchedule(params);

        // Assert
        expect(result.success).toBe(true);
        expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
          every: testCase.every,
          period: testCase.period
        }));
      }
    });

    it('should handle schedule creation with end date exactly one year from start', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);

      const params = {
        every: 1,
        period: 'month',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB'
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }));
    });

    it('should handle schedule creation with various timezones', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const timezones = [
        'Asia/Tokyo',
        'America/New_York',
        'Europe/London',
        'UTC',
        'Asia/Bangkok'
      ];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      for (const timezone of timezones) {
        const params = {
          every: 1,
          period: 'month',
          start_date: futureDate.toISOString(),
          timezone: timezone,
          charge: {
            customer: 'cust_test_1234567890123456789',
            amount: 100000,
            currency: 'THB'
          }
        };

        // Act
        const result = await scheduleTools.createSchedule(params);

        // Assert
        expect(result.success).toBe(true);
        expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
          timezone: timezone
        }));
      }
    });

    it('should handle schedule creation with complex metadata', async () => {
      // Arrange
      const mockSchedule = createMockSchedule();
      mockOmiseClient.post.mockResolvedValue(mockSchedule);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const params = {
        every: 1,
        period: 'month',
        start_date: futureDate.toISOString(),
        charge: {
          customer: 'cust_test_1234567890123456789',
          amount: 100000,
          currency: 'THB',
          metadata: {
            source: 'web',
            version: '1.0',
            active: true,
            count: 5,
            nullValue: null,
            // These should be filtered out
            object: { nested: 'value' },
            array: [1, 2, 3],
            function: () => {},
            undefined: undefined
          }
        },
        metadata: {
          category: 'subscription',
          priority: 'high',
          enabled: true,
          // These should be filtered out
          object: { nested: 'value' },
          array: [1, 2, 3]
        }
      };

      // Act
      const result = await scheduleTools.createSchedule(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.post).toHaveBeenCalledWith('/schedules', expect.objectContaining({
        charge: expect.objectContaining({
          metadata: {
            source: 'web',
            version: '1.0',
            active: true,
            count: 5,
            nullValue: null
          }
        }),
        metadata: {
          category: 'subscription',
          priority: 'high',
          enabled: true
        }
      }));
    });
  });
});
