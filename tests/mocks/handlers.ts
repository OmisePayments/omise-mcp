/**
 * MSW Handlers
 */

import { http, HttpResponse } from 'msw';
import { faker } from '@faker-js/faker';
import { 
  createMockCharge, 
  createMockCustomer, 
  createMockTransfer, 
  createMockRecipient, 
  createMockRefund, 
  createMockDispute, 
  createMockSchedule, 
  createMockEvent, 
  createMockWebhookEndpoint, 
  createMockLink, 
  createMockChain, 
  createMockCapability 
} from '../factories';

export const handlers = [
  // ============================================================================
  // Charge API Mock
  // ============================================================================
  http.post('https://api.omise.co/charges', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(createMockCharge({
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      customer: body.customer
    }));
  }),

  http.get('https://api.omise.co/charges/:id', ({ params }) => {
    return HttpResponse.json(createMockCharge({ id: params.id as string }));
  }),

  http.get('https://api.omise.co/charges', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: Math.min(limit, 10) }, () => createMockCharge()),
      total: 10,
      limit,
      offset,
      order: url.searchParams.get('order') || 'chronological',
      location: '/charges'
    });
  }),

  http.put('https://api.omise.co/charges/:id', ({ params }) => {
    return HttpResponse.json(createMockCharge({ id: params.id as string }));
  }),

  http.post('https://api.omise.co/charges/:id/capture', ({ params }) => {
    return HttpResponse.json(createMockCharge({ id: params.id as string, captured: true }));
  }),

  http.post('https://api.omise.co/charges/:id/reverse', ({ params }) => {
    return HttpResponse.json(createMockCharge({ id: params.id as string, reversed: true }));
  }),

  http.post('https://api.omise.co/charges/:id/expire', ({ params }) => {
    return HttpResponse.json(createMockCharge({ id: params.id as string, expired: true }));
  }),

  // ============================================================================
  // Customer API Mock
  // ============================================================================
  http.post('https://api.omise.co/customers', () => {
    return HttpResponse.json(createMockCustomer());
  }),

  http.get('https://api.omise.co/customers/:id', ({ params }) => {
    return HttpResponse.json(createMockCustomer({ id: params.id as string }));
  }),

  http.get('https://api.omise.co/customers', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: Math.min(limit, 10) }, () => createMockCustomer()),
      total: 10,
      limit,
      offset,
      order: url.searchParams.get('order') || 'chronological',
      location: '/customers'
    });
  }),

  http.put('https://api.omise.co/customers/:id', async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(createMockCustomer({ 
      id: params.id as string,
      email: body.email,
      description: body.description
    }));
  }),

  http.delete('https://api.omise.co/customers/:id', ({ params }) => {
    return HttpResponse.json(createMockCustomer({ id: params.id as string, deleted: true }));
  }),

  // ============================================================================
  // Source API Mock
  // ============================================================================
  http.post('https://api.omise.co/sources', () => {
    return HttpResponse.json(createMockSource());
  }),

  http.get('https://api.omise.co/sources/:id', ({ params }) => {
    return HttpResponse.json(createMockSource({ id: params.id as string }));
  }),

  // ============================================================================
  // Transfer API Mock
  // ============================================================================
  http.post('https://api.omise.co/transfers', () => {
    return HttpResponse.json(createMockTransfer());
  }),

  http.get('https://api.omise.co/transfers/:id', ({ params }) => {
    return HttpResponse.json(createMockTransfer({ id: params.id as string }));
  }),

  http.get('https://api.omise.co/transfers', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockTransfer()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/transfers'
    });
  }),

  http.put('https://api.omise.co/transfers/:id', ({ params }) => {
    return HttpResponse.json(createMockTransfer({ id: params.id as string }));
  }),

  http.delete('https://api.omise.co/transfers/:id', ({ params }) => {
    return HttpResponse.json(createMockTransfer({ id: params.id as string, deleted: true }));
  }),

  // ============================================================================
  // Recipient API Mock
  // ============================================================================
  http.post('https://api.omise.co/recipients', () => {
    return HttpResponse.json(createMockRecipient());
  }),

  http.get('https://api.omise.co/recipients/:id', ({ params }) => {
    return HttpResponse.json(createMockRecipient({ id: params.id as string }));
  }),

  http.get('https://api.omise.co/recipients', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockRecipient()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/recipients'
    });
  }),

  http.put('https://api.omise.co/recipients/:id', ({ params }) => {
    return HttpResponse.json(createMockRecipient({ id: params.id as string }));
  }),

  http.delete('https://api.omise.co/recipients/:id', ({ params }) => {
    return HttpResponse.json(createMockRecipient({ id: params.id as string, deleted: true }));
  }),

  http.post('https://api.omise.co/recipients/:id/verify', ({ params }) => {
    return HttpResponse.json(createMockRecipient({ id: params.id as string, verified: true }));
  }),

  // ============================================================================
  // Refund API Mock
  // ============================================================================
  http.post('https://api.omise.co/charges/:chargeId/refunds', ({ params }) => {
    return HttpResponse.json(createMockRefund({ charge: params.chargeId as string }));
  }),

  http.get('https://api.omise.co/refunds/:id', ({ params }) => {
    return HttpResponse.json(createMockRefund({ id: params.id as string }));
  }),

  http.get('https://api.omise.co/refunds', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockRefund()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/refunds'
    });
  }),

  // ============================================================================
  // Dispute API Mock
  // ============================================================================
  http.get('https://api.omise.co/disputes', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockDispute()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/disputes'
    });
  }),

  http.get('https://api.omise.co/disputes/:id', ({ params }) => {
    return HttpResponse.json(createMockDispute({ id: params.id as string }));
  }),

  http.post('https://api.omise.co/disputes/:id/accept', ({ params }) => {
    return HttpResponse.json(createMockDispute({ id: params.id as string, status: 'accepted' }));
  }),

  http.put('https://api.omise.co/disputes/:id', ({ params }) => {
    return HttpResponse.json(createMockDispute({ id: params.id as string }));
  }),

  // ============================================================================
  // Schedule API Mock
  // ============================================================================
  http.post('https://api.omise.co/schedules', () => {
    return HttpResponse.json(createMockSchedule());
  }),

  http.get('https://api.omise.co/schedules/:id', ({ params }) => {
    return HttpResponse.json(createMockSchedule({ id: params.id as string }));
  }),

  http.get('https://api.omise.co/schedules', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockSchedule()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/schedules'
    });
  }),

  http.delete('https://api.omise.co/schedules/:id', ({ params }) => {
    return HttpResponse.json(createMockSchedule({ id: params.id as string, deleted: true }));
  }),

  http.get('https://api.omise.co/schedules/:id/occurrences', ({ params }) => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 5 }, () => createMockScheduleOccurrence({ schedule: params.id as string })),
      total: 5,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: `/schedules/${params.id}/occurrences`
    });
  }),

  // ============================================================================
  // Event API Mock
  // ============================================================================
  http.get('https://api.omise.co/events', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockEvent()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/events'
    });
  }),

  http.get('https://api.omise.co/events/:id', ({ params }) => {
    return HttpResponse.json(createMockEvent({ id: params.id as string }));
  }),

  // ============================================================================
  // Webhook API Mock
  // ============================================================================
  http.get('https://api.omise.co/webhook_endpoints', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockWebhookEndpoint()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/webhook_endpoints'
    });
  }),

  http.post('https://api.omise.co/webhook_endpoints', () => {
    return HttpResponse.json(createMockWebhookEndpoint());
  }),

  http.get('https://api.omise.co/webhook_endpoints/:id', ({ params }) => {
    return HttpResponse.json(createMockWebhookEndpoint({ id: params.id as string }));
  }),

  http.put('https://api.omise.co/webhook_endpoints/:id', ({ params }) => {
    return HttpResponse.json(createMockWebhookEndpoint({ id: params.id as string }));
  }),

  http.delete('https://api.omise.co/webhook_endpoints/:id', ({ params }) => {
    return HttpResponse.json(createMockWebhookEndpoint({ id: params.id as string, deleted: true }));
  }),

  // ============================================================================
  // Link API Mock
  // ============================================================================
  http.post('https://api.omise.co/links', () => {
    return HttpResponse.json(createMockLink());
  }),

  http.get('https://api.omise.co/links/:id', ({ params }) => {
    return HttpResponse.json(createMockLink({ id: params.id as string }));
  }),

  http.get('https://api.omise.co/links', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockLink()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/links'
    });
  }),

  // ============================================================================
  // Chain API Mock
  // ============================================================================
  http.post('https://api.omise.co/chains', () => {
    return HttpResponse.json(createMockChain());
  }),

  http.get('https://api.omise.co/chains/:id', ({ params }) => {
    return HttpResponse.json(createMockChain({ id: params.id as string }));
  }),

  http.get('https://api.omise.co/chains', () => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 10 }, () => createMockChain()),
      total: 10,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: '/chains'
    });
  }),

  http.get('https://api.omise.co/chains/:id/revisions', ({ params }) => {
    return HttpResponse.json({
      object: 'list',
      data: Array.from({ length: 5 }, () => createMockChainRevision({ chain: params.id as string })),
      total: 5,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: `/chains/${params.id}/revisions`
    });
  }),

  // ============================================================================
  // Capability API Mock
  // ============================================================================
  http.get('https://api.omise.co/capability', () => {
    return HttpResponse.json(createMockCapability());
  }),

  // ============================================================================
  // Error Response Mock
  // ============================================================================
  http.get('https://api.omise.co/charges/chrg_nonexistent', () => {
    return HttpResponse.json({
      object: 'error',
      location: '/charges/chrg_nonexistent',
      code: 'not_found',
      message: 'Charge not found'
    }, { status: 404 });
  }),

  // Handle invalid charge creation (if needed for specific tests)
  http.post('https://api.omise.co/charges', async ({ request }) => {
    const body = await request.json() as any;
    // If amount is invalid, return error
    if (body.amount && body.amount < 0) {
      return HttpResponse.json({
        object: 'error',
        location: '/charges',
        code: 'invalid_request',
        message: 'Invalid amount'
      }, { status: 400 });
    }
    // Otherwise handled by main handler above
    return;
  }),

  // ============================================================================
  // Timeout Error Mock
  // ============================================================================
  http.get('https://api.omise.co/timeout-test', () => {
    return new Promise(() => {}); // Wait indefinitely to cause timeout
  }),

  // ============================================================================
  // Authentication Error Mock
  // ============================================================================
  http.get('https://api.omise.co/auth-error', () => {
    return HttpResponse.json({
      object: 'error',
      location: '/auth-error',
      code: 'authentication_failed',
      message: 'Authentication failed'
    }, { status: 401 });
  })
];

// Helper Functions
function createMockSource(overrides: any = {}) {
  return {
    object: 'source',
    id: overrides.id || `src_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/sources/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    amount: overrides.amount || faker.number.int({ min: 100, max: 100000 }),
    currency: overrides.currency || 'THB',
    type: overrides.type || 'internet_banking_scb',
    flow: overrides.flow || 'redirect',
    status: overrides.status || 'pending',
    ...overrides
  };
}

function createMockScheduleOccurrence(overrides: any = {}) {
  return {
    object: 'schedule_occurrence',
    id: overrides.id || `schd_occ_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/schedules/${overrides.schedule}/occurrences/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    schedule: overrides.schedule || `schd_${faker.string.alphanumeric(16)}`,
    processed_at: faker.date.recent().toISOString(),
    status: overrides.status || 'successful',
    ...overrides
  };
}

function createMockChainRevision(overrides: any = {}) {
  return {
    object: 'chain_revision',
    id: overrides.id || `chn_rev_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/chains/${overrides.chain}/revisions/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    chain: overrides.chain || `chn_${faker.string.alphanumeric(16)}`,
    step_id: overrides.step_id || faker.string.alphanumeric(10),
    status: overrides.status || 'completed',
    result: overrides.result || {},
    ...overrides
  };
}
