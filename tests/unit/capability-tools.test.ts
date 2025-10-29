/**
 * Capability Tools Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CapabilityTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import type { OmiseCapability } from '../../src/types';

// Mock setup
jest.mock('../../src/utils/omise-client');
jest.mock('../../src/utils/logger');

describe('CapabilityTools', () => {
  let capabilityTools: CapabilityTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    capabilityTools = new CapabilityTools(mockOmiseClient, mockLogger);
  });

  // ============================================================================
  // Test Data Factories
  // ============================================================================

  function createMockCapability(overrides: Partial<OmiseCapability> = {}): OmiseCapability {
    return {
      object: 'capability',
      id: 'cap_test',
      livemode: false,
      location: '/capability',
      created: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      features: ['charges', 'customers', 'cards', 'tokens', 'transfers', 'recipients', 'refunds', 'disputes', 'schedules', 'links', 'sources', 'webhooks', 'events'],
      banks: [],
      payment_methods: [
        { name: 'visa', type: 'credit_card', currency: 'THB', supported_currencies: ['THB', 'USD'], country_codes: ['TH', 'US'], installment_terms: [], banks: [], supported_countries: ['TH', 'US'], features: ['3d_secure'] },
        { name: 'mastercard', type: 'credit_card', currency: 'THB', supported_currencies: ['THB', 'USD'], country_codes: ['TH', 'US'], installment_terms: [], banks: [], supported_countries: ['TH', 'US'], features: ['3d_secure'] },
        { name: 'bbl', type: 'internet_banking', currency: 'THB', supported_currencies: ['THB'], country_codes: ['TH'], installment_terms: [], banks: [], supported_countries: ['TH'], features: [] },
        { name: 'ktb', type: 'internet_banking', currency: 'THB', supported_currencies: ['THB'], country_codes: ['TH'], installment_terms: [], banks: [], supported_countries: ['TH'], features: [] },
        { name: '7eleven', type: 'convenience_store', currency: 'THB', supported_currencies: ['THB'], country_codes: ['TH'], installment_terms: [], banks: [], supported_countries: ['TH'], features: [] },
        { name: 'alipay', type: 'e_wallet', currency: 'THB', supported_currencies: ['THB', 'USD'], country_codes: ['TH', 'CN'], installment_terms: [], banks: [], supported_countries: ['TH', 'CN'], features: [] },
        { name: 'bay_installment', type: 'installment', currency: 'THB', supported_currencies: ['THB'], country_codes: ['TH'], installment_terms: [3, 6, 12], banks: [], supported_countries: ['TH'], features: [] }
      ],
      currencies: [
        { code: 'THB', name: 'Thai Baht', symbol: '฿', exponent: 2, supported: true },
        { code: 'USD', name: 'US Dollar', symbol: '$', exponent: 2, supported: true },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', exponent: 0, supported: true }
      ],
      default_currency: 'THB',
      limits: {
        max_charge_amount: 100000000,
        max_transfer_amount: 50000000,
        max_refund_amount: 100000000,
        max_schedule_count: 1000,
        max_webhook_endpoints: 10
      },
      rate_limits: {
        requests_per_minute: 100,
        requests_per_hour: 1000,
        requests_per_day: 10000
      },
      ...overrides
    };
  }

  // ============================================================================
  // Tool Definition Tests
  // ============================================================================

  describe('getTools', () => {
    it('should return correct tool definitions', () => {
      const tools = capabilityTools.getTools();

      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual({
        name: 'retrieve_capability',
        description: 'Retrieve Omise API capabilities and supported features',
        inputSchema: {
          type: 'object',
          properties: {
            include_payment_methods: {
              type: 'boolean',
              description: 'Include detailed payment method information',
              default: true
            },
            include_currencies: {
              type: 'boolean',
              description: 'Include supported currencies information',
              default: true
            },
            include_features: {
              type: 'boolean',
              description: 'Include feature availability information',
              default: true
            }
          }
        }
      });
    });
  });

  // ============================================================================
  // Main Tool Implementation Tests
  // ============================================================================

  describe('retrieveCapability', () => {
    it('should retrieve capability successfully with all enhancements', async () => {
      // Arrange
      const mockCapability = createMockCapability();
      mockOmiseClient.get.mockResolvedValue(mockCapability);

      const params = {
        include_payment_methods: true,
        include_currencies: true,
        include_features: true
      };

      // Act
      const result = await capabilityTools.retrieveCapability(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('availablePaymentMethods');
      expect(result.data).toHaveProperty('capabilityLimits');
      expect(result.data).toHaveProperty('supportedCurrencies');
      expect(result.data).toHaveProperty('featureAvailability');
      expect(result.message).toContain('Omise capabilities retrieved successfully');
      expect(mockOmiseClient.get).toHaveBeenCalledWith('/capability');
      expect(mockLogger.info).toHaveBeenCalledWith('Retrieving Omise capabilities via MCP tool', params);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const params = {};
      const apiError = new Error('API connection failed');
      mockOmiseClient.get.mockRejectedValue(apiError);

      // Act
      const result = await capabilityTools.retrieveCapability(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to retrieve Omise capabilities via MCP tool', apiError, params);
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const params = {};
      mockOmiseClient.get.mockRejectedValue('Unknown error');

      // Act
      const result = await capabilityTools.retrieveCapability(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  // ============================================================================
  // Feature Availability Check Tests
  // ============================================================================

  describe('checkFeatureAvailability', () => {
    it('should return true for available features', () => {
      const capability = createMockCapability();
      
      // Access private method through any type casting
      const result = (capabilityTools as any).checkFeatureAvailability(capability, 'charges');
      
      expect(result).toBe(true);
    });

    it('should return false for unavailable features', () => {
      const capability = createMockCapability();
      
      const result = (capabilityTools as any).checkFeatureAvailability(capability, 'non_existent_feature');
      
      expect(result).toBe(false);
    });

    it('should return false when features array is missing', () => {
      const capability = createMockCapability({ features: undefined });
      
      const result = (capabilityTools as any).checkFeatureAvailability(capability, 'charges');
      
      expect(result).toBe(false);
    });

    it('should return false when features is not an array', () => {
      const capability = createMockCapability({ features: 'not_an_array' as any });
      
      const result = (capabilityTools as any).checkFeatureAvailability(capability, 'charges');
      
      expect(result).toBe(false);
    });
  });

  describe('checkPaymentMethodAvailability', () => {
    it('should return true for available payment methods', () => {
      const capability = createMockCapability();
      
      const result = (capabilityTools as any).checkPaymentMethodAvailability(capability, 'visa');
      
      expect(result).toBe(true);
    });

    it('should return false for unavailable payment methods', () => {
      const capability = createMockCapability();
      
      const result = (capabilityTools as any).checkPaymentMethodAvailability(capability, 'non_existent_method');
      
      expect(result).toBe(false);
    });

    it('should return false when payment_methods array is missing', () => {
      const capability = createMockCapability({ payment_methods: undefined });
      
      const result = (capabilityTools as any).checkPaymentMethodAvailability(capability, 'visa');
      
      expect(result).toBe(false);
    });

    it('should return false when payment_methods is not an array', () => {
      const capability = createMockCapability({ payment_methods: 'not_an_array' as any });
      
      const result = (capabilityTools as any).checkPaymentMethodAvailability(capability, 'visa');
      
      expect(result).toBe(false);
    });
  });

  describe('checkCurrencySupport', () => {
    it('should return true for supported currencies', () => {
      const capability = createMockCapability();
      
      const result = (capabilityTools as any).checkCurrencySupport(capability, 'THB');
      
      expect(result).toBe(true);
    });

    it('should return true for supported currencies with different case', () => {
      const capability = createMockCapability();
      
      const result = (capabilityTools as any).checkCurrencySupport(capability, 'thb');
      
      expect(result).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      const capability = createMockCapability();
      
      const result = (capabilityTools as any).checkCurrencySupport(capability, 'EUR');
      
      expect(result).toBe(false);
    });

    it('should return false when currencies array is missing', () => {
      const capability = createMockCapability({ currencies: undefined });
      
      const result = (capabilityTools as any).checkCurrencySupport(capability, 'THB');
      
      expect(result).toBe(false);
    });

    it('should return false when currencies is not an array', () => {
      const capability = createMockCapability({ currencies: 'not_an_array' as any });
      
      const result = (capabilityTools as any).checkCurrencySupport(capability, 'THB');
      
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Payment Method Categorization Tests
  // ============================================================================

  describe('getAvailablePaymentMethods', () => {
    it('should categorize payment methods correctly', () => {
      const capability = createMockCapability();
      
      const result = capabilityTools.getAvailablePaymentMethods(capability);
      
      expect(result.creditCards).toEqual(['visa', 'mastercard']);
      expect(result.internetBanking).toEqual(['bbl', 'ktb']);
      expect(result.convenienceStores).toEqual(['7eleven']);
      expect(result.eWallets).toEqual(['alipay']);
      expect(result.installments).toEqual(['bay_installment']);
      expect(result.other).toEqual([]);
    });

    it('should handle empty payment methods', () => {
      const capability = createMockCapability({ payment_methods: [] });
      
      const result = capabilityTools.getAvailablePaymentMethods(capability);
      
      expect(result.creditCards).toEqual([]);
      expect(result.internetBanking).toEqual([]);
      expect(result.convenienceStores).toEqual([]);
      expect(result.eWallets).toEqual([]);
      expect(result.installments).toEqual([]);
      expect(result.other).toEqual([]);
    });

    it('should handle undefined payment methods', () => {
      const capability = createMockCapability({ payment_methods: undefined });
      
      const result = capabilityTools.getAvailablePaymentMethods(capability);
      
      expect(result.creditCards).toEqual([]);
      expect(result.internetBanking).toEqual([]);
      expect(result.convenienceStores).toEqual([]);
      expect(result.eWallets).toEqual([]);
      expect(result.installments).toEqual([]);
      expect(result.other).toEqual([]);
    });

    it('should categorize unknown payment method types as other', () => {
      const capability = createMockCapability({
        payment_methods: [
          { name: 'unknown_method', type: 'unknown_type', currency: 'THB', supported_currencies: ['THB'], country_codes: ['TH'], installment_terms: [], banks: [], supported_countries: ['TH'], features: [] }
        ]
      });
      
      const result = capabilityTools.getAvailablePaymentMethods(capability);
      
      expect(result.other).toEqual(['unknown_method']);
    });
  });

  // ============================================================================
  // Capability Limits Tests
  // ============================================================================

  describe('checkCapabilityLimits', () => {
    it('should return correct limits', () => {
      const capability = createMockCapability();
      
      const result = capabilityTools.checkCapabilityLimits(capability);
      
      expect(result).toEqual({
        maxChargeAmount: 100000000,
        maxTransferAmount: 50000000,
        maxRefundAmount: 100000000,
        maxScheduleCount: 1000,
        maxWebhookEndpoints: 10,
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        }
      });
    });

    it('should return default values when limits are missing', () => {
      const capability = createMockCapability({ limits: undefined, rate_limits: undefined });
      
      const result = capabilityTools.checkCapabilityLimits(capability);
      
      expect(result).toEqual({
        maxChargeAmount: 0,
        maxTransferAmount: 0,
        maxRefundAmount: 0,
        maxScheduleCount: 0,
        maxWebhookEndpoints: 0,
        rateLimits: {
          requestsPerMinute: 0,
          requestsPerHour: 0,
          requestsPerDay: 0
        }
      });
    });

    it('should handle partial limits', () => {
      const capability = createMockCapability({
        limits: { max_charge_amount: 50000000, max_transfer_amount: 0, max_refund_amount: 0, max_schedule_count: 0, max_webhook_endpoints: 0 },
        rate_limits: { requests_per_minute: 50, requests_per_hour: 0, requests_per_day: 0 }
      });
      
      const result = capabilityTools.checkCapabilityLimits(capability);
      
      expect(result.maxChargeAmount).toBe(50000000);
      expect(result.maxTransferAmount).toBe(0);
      expect(result.rateLimits.requestsPerMinute).toBe(50);
      expect(result.rateLimits.requestsPerHour).toBe(0);
    });
  });

  // ============================================================================
  // Currency Support Tests
  // ============================================================================

  describe('getSupportedCurrencies', () => {
    it('should return correct currency information', () => {
      const capability = createMockCapability();
      
      const result = capabilityTools.getSupportedCurrencies(capability);
      
      expect(result.currencies).toEqual(['THB', 'USD', 'JPY']);
      expect(result.defaultCurrency).toBe('THB');
      expect(result.currencyDetails).toHaveLength(3);
      expect(result.currencyDetails[0]).toEqual({
        code: 'THB',
        name: 'Thai Baht',
        symbol: '฿',
        decimalPlaces: 2,
        minimumAmount: 1
      });
    });

    it('should handle missing currencies', () => {
      const capability = createMockCapability({ currencies: undefined });
      
      const result = capabilityTools.getSupportedCurrencies(capability);
      
      expect(result.currencies).toEqual([]);
      expect(result.defaultCurrency).toBe('THB');
      expect(result.currencyDetails).toEqual([]);
    });

    it('should use default currency when not specified', () => {
      const capability = createMockCapability({ default_currency: undefined });
      
      const result = capabilityTools.getSupportedCurrencies(capability);
      
      expect(result.defaultCurrency).toBe('THB');
    });
  });

  // ============================================================================
  // Currency Helper Methods Tests
  // ============================================================================

  describe('getCurrencyName', () => {
    it('should return correct currency names', () => {
      expect((capabilityTools as any).getCurrencyName('THB')).toBe('Thai Baht');
      expect((capabilityTools as any).getCurrencyName('USD')).toBe('US Dollar');
      expect((capabilityTools as any).getCurrencyName('JPY')).toBe('Japanese Yen');
      expect((capabilityTools as any).getCurrencyName('EUR')).toBe('Euro');
      expect((capabilityTools as any).getCurrencyName('GBP')).toBe('British Pound');
    });

    it('should return currency code for unknown currencies', () => {
      expect((capabilityTools as any).getCurrencyName('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct currency symbols', () => {
      expect((capabilityTools as any).getCurrencySymbol('THB')).toBe('฿');
      expect((capabilityTools as any).getCurrencySymbol('USD')).toBe('$');
      expect((capabilityTools as any).getCurrencySymbol('JPY')).toBe('¥');
      expect((capabilityTools as any).getCurrencySymbol('EUR')).toBe('€');
      expect((capabilityTools as any).getCurrencySymbol('GBP')).toBe('£');
    });

    it('should return currency code for unknown currencies', () => {
      expect((capabilityTools as any).getCurrencySymbol('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getCurrencyDecimalPlaces', () => {
    it('should return 0 decimal places for JPY', () => {
      expect((capabilityTools as any).getCurrencyDecimalPlaces('JPY')).toBe(0);
    });

    it('should return 2 decimal places for other currencies', () => {
      expect((capabilityTools as any).getCurrencyDecimalPlaces('THB')).toBe(2);
      expect((capabilityTools as any).getCurrencyDecimalPlaces('USD')).toBe(2);
      expect((capabilityTools as any).getCurrencyDecimalPlaces('EUR')).toBe(2);
    });
  });

  describe('getCurrencyMinimumAmount', () => {
    it('should return correct minimum amounts', () => {
      expect((capabilityTools as any).getCurrencyMinimumAmount('THB')).toBe(1);
      expect((capabilityTools as any).getCurrencyMinimumAmount('USD')).toBe(1);
      expect((capabilityTools as any).getCurrencyMinimumAmount('JPY')).toBe(1);
      expect((capabilityTools as any).getCurrencyMinimumAmount('EUR')).toBe(1);
    });

    it('should return 1 for unknown currencies', () => {
      expect((capabilityTools as any).getCurrencyMinimumAmount('UNKNOWN')).toBe(1);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('retrieveCapability integration', () => {
    it('should include all feature availability checks in result', async () => {
      const mockCapability = createMockCapability();
      mockOmiseClient.get.mockResolvedValue(mockCapability);

      const result = await capabilityTools.retrieveCapability({});

      expect(result.success).toBe(true);
      expect(result.data.featureAvailability).toEqual({
        charges: true,
        customers: true,
        cards: true,
        tokens: true,
        transfers: true,
        recipients: true,
        refunds: true,
        disputes: true,
        schedules: true,
        links: true,
        sources: true,
        webhooks: true,
        events: true
      });
    });

    it('should include categorized payment methods in result', async () => {
      const mockCapability = createMockCapability();
      mockOmiseClient.get.mockResolvedValue(mockCapability);

      const result = await capabilityTools.retrieveCapability({});

      expect(result.success).toBe(true);
      expect(result.data.availablePaymentMethods).toEqual({
        creditCards: ['visa', 'mastercard'],
        internetBanking: ['bbl', 'ktb'],
        convenienceStores: ['7eleven'],
        eWallets: ['alipay'],
        installments: ['bay_installment'],
        other: []
      });
    });

    it('should include capability limits in result', async () => {
      const mockCapability = createMockCapability();
      mockOmiseClient.get.mockResolvedValue(mockCapability);

      const result = await capabilityTools.retrieveCapability({});

      expect(result.success).toBe(true);
      expect(result.data.capabilityLimits).toEqual({
        maxChargeAmount: 100000000,
        maxTransferAmount: 50000000,
        maxRefundAmount: 100000000,
        maxScheduleCount: 1000,
        maxWebhookEndpoints: 10,
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        }
      });
    });

    it('should include supported currencies in result', async () => {
      const mockCapability = createMockCapability();
      mockOmiseClient.get.mockResolvedValue(mockCapability);

      const result = await capabilityTools.retrieveCapability({});

      expect(result.success).toBe(true);
      expect(result.data.supportedCurrencies).toEqual({
        currencies: ['THB', 'USD', 'JPY'],
        defaultCurrency: 'THB',
        currencyDetails: [
          { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalPlaces: 2, minimumAmount: 1 },
          { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, minimumAmount: 1 },
          { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, minimumAmount: 1 }
        ]
      });
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle capability with minimal data', async () => {
      const minimalCapability = {
        object: 'capability',
        id: 'cap_test',
        livemode: false,
        location: '/capability',
        created: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      mockOmiseClient.get.mockResolvedValue(minimalCapability);

      const result = await capabilityTools.retrieveCapability({});

      expect(result.success).toBe(true);
      expect(result.data.featureAvailability).toEqual({
        charges: false,
        customers: false,
        cards: false,
        tokens: false,
        transfers: false,
        recipients: false,
        refunds: false,
        disputes: false,
        schedules: false,
        links: false,
        sources: false,
        webhooks: false,
        events: false
      });
    });

    it('should handle null/undefined values gracefully', () => {
      const capability = createMockCapability({
        features: undefined,
        payment_methods: undefined,
        currencies: undefined,
        limits: undefined,
        rate_limits: undefined
      });

      const paymentMethods = capabilityTools.getAvailablePaymentMethods(capability);
      const limits = capabilityTools.checkCapabilityLimits(capability);
      const currencies = capabilityTools.getSupportedCurrencies(capability);

      expect(paymentMethods.creditCards).toEqual([]);
      expect(limits.maxChargeAmount).toBe(0);
      expect(currencies.currencies).toEqual([]);
    });
  });
});
