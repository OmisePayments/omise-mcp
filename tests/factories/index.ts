/**
 * テストデータファクトリー
 */

import { faker } from '@faker-js/faker';

// ============================================================================
// Charge ファクトリー
// ============================================================================
export function createMockCharge(overrides: any = {}) {
  return {
    object: 'charge',
    id: overrides.id || `chrg_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/charges/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    amount: overrides.amount || faker.number.int({ min: 100, max: 100000 }),
    currency: overrides.currency || 'THB',
    description: overrides.description || faker.lorem.sentence(),
    status: overrides.status || 'successful',
    capture: overrides.capture ?? true,
    authorized: overrides.authorized ?? true,
    paid: overrides.paid ?? true,
    transaction: overrides.transaction || `trxn_${faker.string.alphanumeric(16)}`,
    card: overrides.card || createMockCard(),
    source: overrides.source || null,
    customer: overrides.customer || `cust_${faker.string.alphanumeric(16)}`,
    ip: overrides.ip || faker.internet.ip(),
    failure_code: overrides.failure_code || null,
    failure_message: overrides.failure_message || null,
    return_uri: overrides.return_uri || null,
    authorize_uri: overrides.authorize_uri || null,
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Customer ファクトリー
// ============================================================================
export function createMockCustomer(overrides: any = {}) {
  return {
    object: 'customer',
    id: overrides.id || `cust_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/customers/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    email: overrides.email || faker.internet.email(),
    description: overrides.description || faker.lorem.sentence(),
    default_card: overrides.default_card || `card_${faker.string.alphanumeric(16)}`,
    cards: overrides.cards || {
      object: 'list',
      data: Array.from({ length: 3 }, () => createMockCard()),
      total: 3,
      limit: 20,
      offset: 0,
      order: 'chronological',
      location: `/customers/${overrides.id || faker.string.alphanumeric(16)}/cards`
    },
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Card ファクトリー
// ============================================================================
export function createMockCard(overrides: any = {}) {
  return {
    object: 'card',
    id: overrides.id || `card_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/cards/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    brand: overrides.brand || faker.helpers.arrayElement(['Visa', 'MasterCard', 'JCB', 'American Express']),
    last_digits: overrides.last_digits || faker.string.numeric(4),
    name: overrides.name || faker.person.fullName(),
    expiration_month: overrides.expiration_month || faker.number.int({ min: 1, max: 12 }),
    expiration_year: overrides.expiration_year || faker.number.int({ min: 2025, max: 2030 }),
    fingerprint: overrides.fingerprint || faker.string.alphanumeric(40),
    funding: overrides.funding || faker.helpers.arrayElement(['credit', 'debit', 'prepaid']),
    country: overrides.country || faker.location.countryCode(),
    city: overrides.city || faker.location.city(),
    postal_code: overrides.postal_code || faker.location.zipCode(),
    bank: overrides.bank || faker.company.name(),
    ...overrides
  };
}

// ============================================================================
// Token ファクトリー
// ============================================================================
export function createMockToken(overrides: any = {}) {
  return {
    object: 'token',
    id: overrides.id || `tokn_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/tokens/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    used: overrides.used ?? false,
    card: overrides.card || createMockCard(),
    ...overrides
  };
}

// ============================================================================
// Transfer ファクトリー
// ============================================================================
export function createMockTransfer(overrides: any = {}) {
  return {
    object: 'transfer',
    id: overrides.id || `trsf_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/transfers/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    amount: overrides.amount || faker.number.int({ min: 100, max: 100000 }),
    currency: overrides.currency || 'THB',
    description: overrides.description || faker.lorem.sentence(),
    status: overrides.status || 'sent',
    recipient: overrides.recipient || `recp_${faker.string.alphanumeric(19)}`,
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Recipient ファクトリー
// ============================================================================
export function createMockRecipient(overrides: any = {}) {
  return {
    object: 'recipient',
    id: overrides.id || `recp_${faker.string.alphanumeric(19)}`,
    livemode: false,
    location: `/recipients/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    email: overrides.email || faker.internet.email(),
    name: overrides.name || faker.person.fullName(),
    type: overrides.type || faker.helpers.arrayElement(['individual', 'corporation']),
    tax_id: overrides.tax_id || faker.string.numeric(13),
    bank_account: overrides.bank_account || {
      object: 'bank_account',
      brand: faker.helpers.arrayElement(['bbl', 'ktb', 'scb', 'bay']),
      number: faker.string.numeric(10),
      name: faker.person.fullName(),
      last_digits: faker.string.numeric(4)
    },
    failure_code: overrides.failure_code || null,
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Refund ファクトリー
// ============================================================================
export function createMockRefund(overrides: any = {}) {
  return {
    object: 'refund',
    id: overrides.id || `rfnd_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/refunds/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    amount: overrides.amount || faker.number.int({ min: 100, max: 100000 }),
    currency: overrides.currency || 'THB',
    status: overrides.status || 'closed',
    reason: overrides.reason || faker.helpers.arrayElement(['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge']),
    charge: overrides.charge || `chrg_${faker.string.alphanumeric(16)}`,
    transaction: overrides.transaction || `trxn_${faker.string.alphanumeric(16)}`,
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Dispute ファクトリー
// ============================================================================
export function createMockDispute(overrides: any = {}) {
  return {
    object: 'dispute',
    id: overrides.id || `dspt_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/disputes/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    amount: overrides.amount || faker.number.int({ min: 100, max: 100000 }),
    currency: overrides.currency || 'THB',
    status: overrides.status || faker.helpers.arrayElement(['open', 'pending', 'closed']),
    message: overrides.message || faker.lorem.sentence(),
    charge: overrides.charge || `chrg_${faker.string.alphanumeric(16)}`,
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Schedule ファクトリー
// ============================================================================
export function createMockSchedule(overrides: any = {}) {
  return {
    object: 'schedule',
    id: overrides.id || `schd_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/schedules/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    status: overrides.status || faker.helpers.arrayElement(['active', 'expiring', 'expired', 'deleted']),
    every: overrides.every || faker.number.int({ min: 1, max: 12 }),
    period: overrides.period || faker.helpers.arrayElement(['day', 'week', 'month', 'year']),
    on: overrides.on || {},
    start_date: overrides.start_date || faker.date.future().toISOString(),
    end_date: overrides.end_date || faker.date.future().toISOString(),
    next_occurrence_on: overrides.next_occurrence_on || faker.date.future().toISOString(),
    charge: overrides.charge || createMockCharge(),
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Event ファクトリー
// ============================================================================
export function createMockEvent(overrides: any = {}) {
  return {
    object: 'event',
    id: overrides.id || `evnt_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/events/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    key: overrides.key || faker.helpers.arrayElement(['charge.create', 'charge.complete', 'customer.create', 'transfer.create']),
    data: overrides.data || createMockCharge(),
    ...overrides
  };
}

// ============================================================================
// Webhook Endpoint ファクトリー
// ============================================================================
export function createMockWebhookEndpoint(overrides: any = {}) {
  return {
    object: 'webhook_endpoint',
    id: overrides.id || `wbhk_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/webhook_endpoints/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    url: overrides.url || faker.internet.url(),
    description: overrides.description || faker.lorem.sentence(),
    events: overrides.events || ['charge.create', 'charge.complete'],
    secret_key: overrides.secret_key || faker.string.alphanumeric(32),
    status: overrides.status || faker.helpers.arrayElement(['active', 'inactive', 'disabled']),
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Link ファクトリー
// ============================================================================
export function createMockLink(overrides: any = {}) {
  return {
    object: 'link',
    id: overrides.id || `link_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/links/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    amount: overrides.amount || faker.number.int({ min: 100, max: 100000 }),
    currency: overrides.currency || 'THB',
    title: overrides.title || faker.lorem.sentence(),
    description: overrides.description || faker.lorem.paragraph(),
    multiple: overrides.multiple ?? false,
    used: overrides.used || faker.number.int({ min: 0, max: 10 }),
    charges: overrides.charges || [],
    payment_uri: overrides.payment_uri || faker.internet.url(),
    expires_at: overrides.expires_at || faker.date.future().toISOString(),
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Chain ファクトリー
// ============================================================================
export function createMockChain(overrides: any = {}) {
  return {
    object: 'chain',
    id: overrides.id || `chn_${faker.string.alphanumeric(16)}`,
    livemode: false,
    location: `/chains/${overrides.id || faker.string.alphanumeric(16)}`,
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    name: overrides.name || faker.lorem.sentence(),
    description: overrides.description || faker.lorem.paragraph(),
    status: overrides.status || faker.helpers.arrayElement(['pending', 'running', 'completed', 'failed', 'cancelled']),
    steps: overrides.steps || [
      {
        step_id: 'step_1',
        action: 'charge',
        parameters: { amount: 1000, currency: 'THB' },
        status: 'completed'
      }
    ],
    rollback_steps: overrides.rollback_steps || [],
    timeout: overrides.timeout || 300,
    metadata: overrides.metadata || {},
    ...overrides
  };
}

// ============================================================================
// Capability ファクトリー
// ============================================================================
export function createMockCapability(overrides: any = {}) {
  return {
    object: 'capability',
    livemode: false,
    location: '/capability',
    created: faker.date.past().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    features: overrides.features || [
      'charges', 'customers', 'cards', 'tokens', 'transfers',
      'recipients', 'refunds', 'disputes', 'schedules', 'links',
      'sources', 'webhooks', 'events'
    ],
    payment_methods: overrides.payment_methods || [
      { name: 'internet_banking_scb', type: 'internet_banking' },
      { name: 'internet_banking_ktb', type: 'internet_banking' },
      { name: 'alipay', type: 'e_wallet' },
      { name: 'promptpay', type: 'e_wallet' },
      { name: 'installment_bay', type: 'installment' }
    ],
    currencies: overrides.currencies || ['THB', 'USD', 'JPY', 'EUR', 'GBP'],
    default_currency: overrides.default_currency || 'THB',
    limits: overrides.limits || {
      max_charge_amount: 1000000,
      max_transfer_amount: 1000000,
      max_refund_amount: 1000000,
      max_schedule_count: 100,
      max_webhook_endpoints: 10
    },
    rate_limits: overrides.rate_limits || {
      requests_per_minute: 100,
      requests_per_hour: 1000,
      requests_per_day: 10000
    },
    ...overrides
  };
}
