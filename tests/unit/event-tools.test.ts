/**
 * Event Tools Unit Tests
 */

import { EventTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import type { OmiseEvent, OmiseListResponse } from '../../src/types';
import { createMockEvent } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client.js');
jest.mock('../../src/utils/logger.js');

describe('EventTools', () => {
  let eventTools: EventTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({
      baseUrl: 'https://api.omise.co',
      secretKey: 'skey_test_123',
    } as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    eventTools = new EventTools(mockOmiseClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTools', () => {
    it('should return all event-related tools', () => {
      const tools = eventTools.getTools();
      
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual([
        'list_events',
        'retrieve_event'
      ]);
    });

    it('should have correct tool schemas', () => {
      const tools = eventTools.getTools();
      
      // Check list_events schema
      const listEventsTool = tools.find(t => t.name === 'list_events');
      expect(listEventsTool?.inputSchema.properties).toHaveProperty('limit');
      expect(listEventsTool?.inputSchema.properties).toHaveProperty('offset');
      expect(listEventsTool?.inputSchema.properties).toHaveProperty('order');
      expect(listEventsTool?.inputSchema.properties).toHaveProperty('type');
      expect(listEventsTool?.inputSchema.properties).toHaveProperty('key');
      expect(listEventsTool?.inputSchema.properties).toHaveProperty('livemode');
      
      // Check retrieve_event schema
      const retrieveEventTool = tools.find(t => t.name === 'retrieve_event');
      expect(retrieveEventTool?.inputSchema.required).toEqual(['event_id']);
    });

    it('should have correct event type enum values', () => {
      const tools = eventTools.getTools();
      const listEventsTool = tools.find(t => t.name === 'list_events');
      const typeEnum = listEventsTool?.inputSchema.properties?.type?.enum;
      
      expect(typeEnum).toContain('charge.create');
      expect(typeEnum).toContain('charge.complete');
      expect(typeEnum).toContain('customer.create');
      expect(typeEnum).toContain('dispute.create');
      expect(typeEnum).toContain('schedule.create');
      expect(typeEnum).toContain('link.create');
    });
  });

  describe('listEvents', () => {
    it('should list events successfully with default parameters', async () => {
      const mockEvents: OmiseListResponse<OmiseEvent> = {
        object: 'list',
        data: [createMockEvent()],
        total: 1,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/events'
      };

      mockOmiseClient.get.mockResolvedValue(mockEvents);

      const result = await eventTools.listEvents({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEvents);
      expect(result.message).toBe('Retrieved 1 events (total: 1)');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/events', {
        limit: 20,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should list events with custom parameters', async () => {
      const mockEvents: OmiseListResponse<OmiseEvent> = {
        object: 'list',
        data: [createMockEvent()],
        total: 1,
        limit: 10,
        offset: 5,
        order: 'reverse_chronological' as const,
        location: '/events'
      };

      mockOmiseClient.get.mockResolvedValue(mockEvents);

      const params = {
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        type: 'charge.create',
        key: 'chrg_test_1234567890abcdefghi',
        livemode: false,
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      };

      const result = await eventTools.listEvents(params);

      expect(result.success).toBe(true);
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/events', {
        limit: 10,
        offset: 5,
        order: 'reverse_chronological',
        type: 'charge.create',
        key: 'chrg_test_1234567890abcdefghi',
        livemode: false,
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      });
    });

    it('should enforce limit and offset constraints', async () => {
      const mockEvents: OmiseListResponse<OmiseEvent> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
        order: 'chronological' as const,
        location: '/events'
      };

      mockOmiseClient.get.mockResolvedValue(mockEvents);

      const params = {
        limit: 150, // Should be capped at 100
        offset: -5   // Should be set to 0
      };

      await eventTools.listEvents(params);

      expect(mockOmiseClient.get).toHaveBeenCalledWith('/events', {
        limit: 100,
        offset: 0,
        order: 'chronological'
      });
    });

    it('should validate event type', async () => {
      const result = await eventTools.listEvents({
        type: 'invalid.event.type'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid event type. Must be one of the supported event types.');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should validate resource key format', async () => {
      const result = await eventTools.listEvents({
        key: 'invalid_key_format'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid resource key format. Must be a valid Omise resource ID.');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should validate date range - from after to', async () => {
      const result = await eventTools.listEvents({
        from: '2024-12-31T23:59:59Z',
        to: '2024-01-01T00:00:00Z'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('From date must be before to date');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should validate date range - exceeds one year', async () => {
      const result = await eventTools.listEvents({
        from: '2024-01-01T00:00:00Z',
        to: '2025-02-01T00:00:00Z' // More than 1 year
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Date range must be within one year');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockOmiseClient.get.mockRejectedValue(error);

      const result = await eventTools.listEvents({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list events via MCP tool',
        error,
        {}
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.get.mockRejectedValue('String error');

      const result = await eventTools.listEvents({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list events via MCP tool',
        'String error',
        {}
      );
    });
  });

  describe('retrieveEvent', () => {
    it('should retrieve event successfully with valid ID', async () => {
      const mockEvent = createMockEvent();
      mockOmiseClient.get.mockResolvedValue(mockEvent);

      const result = await eventTools.retrieveEvent({
        event_id: 'evnt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEvent);
      expect(result.message).toBe('Event retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/events/evnt_test_1234567890abcdefghi');
    });

    it('should validate event ID format', async () => {
      const result = await eventTools.retrieveEvent({
        event_id: 'invalid_id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid event ID format. Must be in format: evnt_xxxxxxxxxxxxxxxx');
      expect(mockOmiseClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = new Error('Event not found');
      mockOmiseClient.get.mockRejectedValue(error);

      const result = await eventTools.retrieveEvent({
        event_id: 'evnt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.get.mockRejectedValue({ code: 'error_code' });

      const result = await eventTools.retrieveEvent({
        event_id: 'evnt_test_1234567890abcdefghi'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Validation Functions', () => {
    describe('validateEventId', () => {
      it('should validate correct event ID formats', () => {
        const validIds = [
          'evnt_test_1234567890abcdefghi',
          'evnt_1234567890abcdefghi'
        ];

        validIds.forEach(id => {
          const result = (eventTools as any).validateEventId(id);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid event ID formats', () => {
        const invalidIds = [
          'evnt_invalid',
          'evnt_test_',
          'evnt_',
          'invalid_id',
          'evnt_test_1234567890ABCDEF', // uppercase
          'evnt_test_1234567890abcdefghijkl' // too long
        ];

        invalidIds.forEach(id => {
          const result = (eventTools as any).validateEventId(id);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateEventType', () => {
      it('should validate correct event types', () => {
        const validTypes = [
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

        validTypes.forEach(type => {
          const result = (eventTools as any).validateEventType(type);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid event types', () => {
        const invalidTypes = [
          'invalid.event.type',
          'charge.invalid',
          'unknown.create',
          'event.type'
        ];

        invalidTypes.forEach(type => {
          const result = (eventTools as any).validateEventType(type);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateResourceKey', () => {
      it('should validate correct resource key formats', () => {
        const validKeys = [
          'chrg_test_1234567890abcdefghi',
          'cust_test_1234567890abcdefghi',
          'card_test_1234567890abcdefghi',
          'trsf_test_1234567890abcdefghi',
          'recp_test_1234567890abcdefghi',
          'rfnd_test_1234567890abcdefghi',
          'dspt_test_1234567890abcdefghi',
          'schd_test_1234567890abcdefghi',
          'link_test_1234567890abcdefghi',
          'chrg_1234567890abcdefghi', // production format
          'cust_1234567890abcdefghi'  // production format
        ];

        validKeys.forEach(key => {
          const result = (eventTools as any).validateResourceKey(key);
          expect(result).toBe(true);
        });
      });

      it('should reject invalid resource key formats', () => {
        const invalidKeys = [
          'invalid_key',
          'chrg_invalid',
          'unknown_test_1234567890abcdefghi',
          'chrg_test_1234567890ABCDEF', // uppercase
          'chrg_test_1234567890abcdefghijkl' // too long
        ];

        invalidKeys.forEach(key => {
          const result = (eventTools as any).validateResourceKey(key);
          expect(result).toBe(false);
        });
      });
    });

    describe('validateDateRange', () => {
      it('should validate correct date ranges', () => {
        const validRanges = [
          { from: '2024-01-01T00:00:00Z', to: '2024-12-31T23:59:59Z' },
          { from: '2024-06-01T00:00:00Z', to: '2024-06-30T23:59:59Z' },
          { from: '2024-01-01T00:00:00Z', to: '2024-01-01T23:59:59Z' }
        ];

        validRanges.forEach(range => {
          const result = (eventTools as any).validateDateRange(range.from, range.to);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });

      it('should reject invalid date ranges', () => {
        const invalidRanges = [
          { from: '2024-12-31T23:59:59Z', to: '2024-01-01T00:00:00Z', expectedError: 'From date must be before to date' },
          { from: '2024-01-01T00:00:00Z', to: '2025-02-01T00:00:00Z', expectedError: 'Date range must be within one year' },
          { from: '2024-01-01T00:00:00Z', to: '2025-01-02T00:00:00Z', expectedError: 'Date range must be within one year' }
        ];

        invalidRanges.forEach(range => {
          const result = (eventTools as any).validateDateRange(range.from, range.to);
          expect(result.valid).toBe(false);
          expect(result.error).toBe(range.expectedError);
        });
      });

      it('should handle missing dates', () => {
        const result1 = (eventTools as any).validateDateRange('', '2024-12-31T23:59:59Z');
        expect(result1.valid).toBe(true);

        const result2 = (eventTools as any).validateDateRange('2024-01-01T00:00:00Z', '');
        expect(result2.valid).toBe(true);

        const result3 = (eventTools as any).validateDateRange('', '');
        expect(result3.valid).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle livemode parameter correctly', async () => {
      const mockEvents: OmiseListResponse<OmiseEvent> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/events'
      };

      mockOmiseClient.get.mockResolvedValue(mockEvents);

      // Test with livemode: true
      await eventTools.listEvents({ livemode: true });
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/events', expect.objectContaining({
        livemode: true
      }));

      // Test with livemode: false
      await eventTools.listEvents({ livemode: false });
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/events', expect.objectContaining({
        livemode: false
      }));

      // Test without livemode parameter
      await eventTools.listEvents({});
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/events', expect.not.objectContaining({
        livemode: expect.anything()
      }));
    });

    it('should handle empty event list', async () => {
      const mockEvents: OmiseListResponse<OmiseEvent> = {
        object: 'list',
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        order: 'chronological' as const,
        location: '/events'
      };

      mockOmiseClient.get.mockResolvedValue(mockEvents);

      const result = await eventTools.listEvents({});

      expect(result.success).toBe(true);
      expect(result.message).toBe('Retrieved 0 events (total: 0)');
    });

    it('should handle large event list', async () => {
      const mockEvents: OmiseListResponse<OmiseEvent> = {
        object: 'list',
        data: Array(100).fill(null).map(() => createMockEvent()),
        total: 100,
        limit: 100,
        offset: 0,
        order: 'chronological' as const,
        location: '/events'
      };

      mockOmiseClient.get.mockResolvedValue(mockEvents);

      const result = await eventTools.listEvents({ limit: 100 });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Retrieved 100 events (total: 100)');
    });
  });
});
