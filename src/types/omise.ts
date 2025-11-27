/**
 * Omise API v2017-11-02 Comprehensive Type Definitions
 */

// ============================================================================
// Basic Type Definitions
// ============================================================================

export interface OmiseConfig {
  secretKey: string;
  environment: 'production' | 'test';
  apiVersion: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  server?: {
    name: string;
    version: string;
  };
  logging?: {
    enableRequestLogging: boolean;
    enableResponseLogging: boolean;
  };
}

export interface OmiseError {
  object: 'error';
  location: string;
  code: string;
  message: string;
}

export interface OmiseResponse<T> {
  object: string;
  data?: T;
  error?: OmiseError;
}

export interface OmiseListResponse<T> {
  object: 'list';
  data: T[];
  total: number;
  limit: number;
  offset: number;
  order: 'chronological' | 'reverse_chronological';
  location: string;
}

// ============================================================================
// Common Type Definitions
// ============================================================================

export interface OmiseBaseObject {
  id: string;
  object: string;
  livemode: boolean;
  location: string;
  created: string;
  created_at: string;
  updated_at: string;
}

export interface OmiseMetadata {
  [key: string]: string | number | boolean | null;
}

// ============================================================================
// Charge (Payment)
// ============================================================================

export interface OmiseCharge extends OmiseBaseObject {
  object: 'charge';
  amount: number;
  currency: string;
  description?: string;
  status: 'pending' | 'failed' | 'successful';
  capture: boolean;
  authorized: boolean;
  paid: boolean;
  transaction?: string;
  card?: OmiseCard;
  source?: OmiseSource;
  customer?: string;
  ip?: string;
  failure_code?: string;
  failure_message?: string;
  return_uri?: string;
  authorize_uri?: string;
  metadata?: OmiseMetadata;
  // Partial Capture fields
  authorization_type?: 'pre_auth' | 'final_auth';
  authorized_amount?: number;
  captured_amount?: number;
  capturable?: boolean;
  reversible?: boolean;
  reversed?: boolean;
  reversed_at?: string;
  authorized_at?: string;
  paid_at?: string;
  expires_at?: string;
  expired_at?: string;
  expired?: boolean;
  // Financial fields
  net?: number;
  fee?: number;
  fee_vat?: number;
  interest?: number;
  interest_vat?: number;
  funding_amount?: number;
  refunded_amount?: number;
  // Status flags
  refundable?: boolean;
  partially_refundable?: boolean;
  disputable?: boolean;
  voided?: boolean;
  multi_capture?: boolean;
}

// ============================================================================
// Customer
// ============================================================================

export interface OmiseCustomer extends OmiseBaseObject {
  object: 'customer';
  default_card?: string;
  email?: string;
  description?: string;
  metadata?: OmiseMetadata;
  cards?: OmiseListResponse<OmiseCard>;
}

// ============================================================================
// Card
// ============================================================================

export interface OmiseCard extends OmiseBaseObject {
  object: 'card';
  country: string;
  city?: string;
  postal_code?: string;
  financing: string;
  bank: string;
  last_digits: string;
  brand: string;
  expiration_month: number;
  expiration_year: number;
  fingerprint: string;
  name?: string;
  security_code_check: boolean;
}

// ============================================================================
// Transfer
// ============================================================================

export interface OmiseTransfer extends OmiseBaseObject {
  object: 'transfer';
  amount: number;
  currency: string;
  sent: boolean;
  paid: boolean;
  sendable: boolean;
  failure_code?: string;
  failure_message?: string;
  transaction?: string;
  metadata?: OmiseMetadata;
}

// ============================================================================
// Recipient
// ============================================================================

export interface OmiseRecipient extends OmiseBaseObject {
  object: 'recipient';
  verified: boolean;
  active: boolean;
  name: string;
  email?: string;
  description?: string;
  type: 'individual' | 'corporation';
  tax_id?: string;
  bank_account?: OmiseBankAccount;
  failure_code?: string;
  metadata?: OmiseMetadata;
}

export interface OmiseBankAccount {
  object: 'bank_account';
  brand: string;
  last_digits: string;
  name: string;
  created: string;
}

// ============================================================================
// Transaction
// ============================================================================

export interface OmiseTransaction extends OmiseBaseObject {
  object: 'transaction';
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  direction: 'credit' | 'debit';
  key: string;
  origin?: string;
  transferable?: string;
  created_at: string;
}

// ============================================================================
// Refund
// ============================================================================

export interface OmiseRefund extends OmiseBaseObject {
  object: 'refund';
  amount: number;
  currency: string;
  charge: string;
  transaction?: string;
  voided: boolean;
  metadata?: OmiseMetadata;
}

// ============================================================================
// Dispute (Chargeback)
// ============================================================================

export interface OmiseDispute extends OmiseBaseObject {
  object: 'dispute';
  amount: number;
  currency: string;
  status: 'open' | 'pending' | 'closed';
  message?: string;
  charge: string;
  admin_message?: string;
  reason_code?: string;
  reason_message?: string;
  admin_reason_code?: string;
  admin_reason_message?: string;
  documents?: OmiseDisputeDocument[];
  metadata?: OmiseMetadata;
}

export interface OmiseDisputeDocument {
  object: 'dispute_document';
  id: string;
  filename: string;
  created: string;
}

// ============================================================================
// Event
// ============================================================================

export interface OmiseEvent extends OmiseBaseObject {
  object: 'event';
  key: string;
  data: OmiseEventData;
}

export interface OmiseEventData {
  object: string;
  id: string;
  livemode: boolean;
  created: string;
}

// ============================================================================
// Schedule
// ============================================================================

export interface OmiseSchedule extends OmiseBaseObject {
  object: 'schedule';
  status: 'active' | 'expiring' | 'expired' | 'deleted' | 'suspended';
  every: number;
  period: 'day' | 'week' | 'month';
  on?: OmiseScheduleOn;
  in_words?: string;
  start_date: string;
  end_date?: string;
  next_occurrence_on?: string;
  occurrences?: OmiseListResponse<OmiseOccurrence>;
  occurrences_total?: number;
  metadata?: OmiseMetadata;
}
export interface OmiseScheduleOn {
  weekdays?: number[];
  days_of_month?: number[];
}

export interface OmiseOccurrence extends OmiseBaseObject {
  object: 'occurrence';
  schedule: string;
  processed_at?: string;
  scheduled_on: string;
  retry_date?: string;
  status: 'successful' | 'failed' | 'skipped';
  message?: string;
  result?: string;
}

export interface OmiseScheduleOccurrence extends OmiseOccurrence {
  // Additional properties specific to schedule occurrences
}

// ============================================================================
// Source (Payment Source)
// ============================================================================

export interface OmiseSource extends OmiseBaseObject {
  object: 'source';
  type: string;
  flow: string;
  amount: number;
  currency: string;
  charge_status: 'unknown' | 'failed' | 'expired' | 'pending' | 'reversed' | 'successful';
  receipt?: OmiseReceipt;
  references?: OmiseReferences;
  metadata?: OmiseMetadata;
}

export interface OmiseReceipt {
  number?: string;
  method?: string;
  reference?: string;
  reference_number?: string;
  reference_type?: string;
  customer_reference?: string;
  customer_reference_number?: string;
  customer_reference_type?: string;
  authorization_code?: string;
  note?: string;
  subnote?: string;
  note_th?: string;
  subnote_th?: string;
}

export interface OmiseReferences {
  [key: string]: string;
}

// ============================================================================
// Capability
// ============================================================================

// ============================================================================
// Request Type Definitions
// ============================================================================

export interface CreateChargeRequest {
  amount: number;
  currency: string;
  description?: string;
  capture?: boolean;
  card?: string;
  customer?: string;
  source?: string;
  return_uri?: string;
  authorization_type?: 'pre_auth';
  metadata?: OmiseMetadata;
}

export interface CreateCustomerRequest {
  email?: string;
  description?: string;
  card?: string;
  metadata?: OmiseMetadata;
}

export interface CreateTransferRequest {
  amount: number;
  currency?: string;
  recipient: string;
  description?: string;
  scheduled_date?: string;
  metadata?: OmiseMetadata;
}

export interface CreateRecipientRequest {
  name: string;
  email?: string;
  description?: string;
  type: 'individual' | 'corporation';
  tax_id?: string;
  bank_account: {
    brand: string;
    number: string;
    name: string;
  };
  metadata?: OmiseMetadata;
}

export interface CreateRefundRequest {
  amount?: number;
  reason?: string;
  description?: string;
  metadata?: OmiseMetadata;
}

export interface CreateSourceRequest {
  type: string;
  amount: number;
  currency: string;
  metadata?: OmiseMetadata;
}

export interface CreateScheduleRequest {
  every: number;
  period: 'day' | 'week' | 'month';
  on?: OmiseScheduleOn;
  start_date: string;
  end_date?: string;
  timezone?: string;
  description?: string;
  charge: {
    customer: string;
    amount: number;
    currency: string;
    description?: string;
  };
  metadata?: OmiseMetadata;
}

// ============================================================================
// Update Request Type Definitions
// ============================================================================

export interface UpdateCustomerRequest {
  email?: string;
  description?: string;
  default_card?: string;
  card?: string;
  metadata?: OmiseMetadata;
}

export interface UpdateRecipientRequest {
  name?: string;
  email?: string;
  description?: string;
  tax_id?: string;
  bank_account?: {
    brand: string;
    number: string;
    name: string;
  };
  metadata?: OmiseMetadata;
}

export interface UpdateScheduleRequest {
  every?: number;
  period?: 'day' | 'week' | 'month';
  on?: OmiseScheduleOn;
  end_date?: string;
  metadata?: OmiseMetadata;
}

export interface UpdateTransferRequest {
  amount?: number;
  description?: string;
  scheduled_date?: string;
  metadata?: OmiseMetadata;
}

// ============================================================================
// Search & Filter Type Definitions
// ============================================================================

export interface OmiseSearchParams {
  limit?: number;
  offset?: number;
  order?: 'chronological' | 'reverse_chronological';
  from?: string;
  to?: string;
}

export interface OmiseChargeSearchParams extends OmiseSearchParams {
  status?: 'pending' | 'failed' | 'successful';
  customer?: string;
  card?: string;
}

export interface OmiseTransactionSearchParams extends OmiseSearchParams {
  type?: 'credit' | 'debit';
  direction?: 'credit' | 'debit';
}

export interface OmiseDisputeSearchParams extends OmiseSearchParams {
  status?: 'open' | 'pending' | 'closed';
}

// ============================================================================
// Capability Type Definitions
// ============================================================================

export interface OmiseCapability extends OmiseBaseObject {
  object: 'capability';
  features: string[];
  payment_methods: OmisePaymentMethod[];
  currencies: OmiseCurrency[];
  default_currency: string;
  limits: {
    max_charge_amount: number;
    max_transfer_amount: number;
    max_refund_amount: number;
    max_schedule_count: number;
    max_webhook_endpoints: number;
  };
  rate_limits: {
    requests_per_minute: number;
    requests_per_hour: number;
    requests_per_day: number;
  };
}

export interface OmisePaymentMethod {
  name: string;
  type: string;
  supported_currencies: string[];
  supported_countries: string[];
  features: string[];
}

export interface OmiseCurrency {
  code: string;
  name: string;
  symbol: string;
  exponent: number;
  supported: boolean;
}
