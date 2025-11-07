/**
 * Token Tools Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TokenTools } from '../../src/tools';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import { createMockToken } from '../factories';

// Mock setup
jest.mock('../../src/utils/omise-client');
jest.mock('../../src/utils/logger');

describe('TokenTools', () => {
  let tokenTools: TokenTools;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOmiseClient = new OmiseClient({} as any, {} as any) as jest.Mocked<OmiseClient>;
    mockLogger = new Logger({} as any) as jest.Mocked<Logger>;
    tokenTools = new TokenTools(mockOmiseClient, mockLogger);
  });

  describe('getTools', () => {
    it('should return correct tool definitions', () => {
      const tools = tokenTools.getTools();
      
      expect(tools).toHaveLength(2);
      expect(tools[0]?.name).toBe('create_token');
      expect(tools[1]?.name).toBe('retrieve_token');
      
      // Check create_token tool schema
      expect(tools[0]?.inputSchema.properties).toBeDefined();
      expect(tools[0]?.inputSchema.properties).toHaveProperty('card_number');
      expect(tools[0]?.inputSchema.properties).toHaveProperty('card_name');
      expect(tools[0]?.inputSchema.properties).toHaveProperty('expiration_month');
      expect(tools[0]?.inputSchema.properties).toHaveProperty('expiration_year');
      expect(tools[0]?.inputSchema.properties).toHaveProperty('security_code');
      expect(tools[0]?.inputSchema.properties).toHaveProperty('city');
      expect(tools[0]?.inputSchema.properties).toHaveProperty('postal_code');
      expect(tools[0]?.inputSchema.required).toEqual(['card_number', 'card_name', 'expiration_month', 'expiration_year']);
      
      // Check retrieve_token tool schema
      expect(tools[1]?.inputSchema.properties).toBeDefined();
      expect(tools[1]?.inputSchema.properties).toHaveProperty('token_id');
      expect(tools[1]?.inputSchema.required).toEqual(['token_id']);
    });
  });

  describe('createToken', () => {
    it('should create a token successfully with required parameters', async () => {
      // Arrange
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockToken);
      expect(result.message).toContain('Token created successfully');
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242',
          expiration_month: 12,
          expiration_year: 2025
        }
      });
    });

    it('should create a token with all optional parameters', async () => {
      // Arrange
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: '123',
        city: 'Bangkok',
        postal_code: '10110'
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockToken);
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242',
          expiration_month: 12,
          expiration_year: 2025,
          security_code: '123',
          city: 'Bangkok',
          postal_code: '10110'
        }
      });
    });

    it('should handle card number with spaces and dashes', async () => {
      // Arrange
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const params = {
        card_number: '4242-4242-4242-4242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242', // spaces and dashes removed
          expiration_month: 12,
          expiration_year: 2025
        }
      });
    });

    it('should fail with invalid card number format - too short', async () => {
      // Arrange
      const params = {
        card_number: '123456789012', // 12 digits - too short
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid card number format');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with invalid card number format - too long', async () => {
      // Arrange
      const params = {
        card_number: '12345678901234567890', // 20 digits - too long
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid card number format');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with invalid card number format - non-numeric', async () => {
      // Arrange
      const params = {
        card_number: '4242-4242-4242-424a', // contains letter
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid card number format');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with expired card - past year', async () => {
      // Arrange
      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2020 // expired year
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid expiration date');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with expired card - current year but past month', async () => {
      // Arrange
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const pastMonth = currentMonth > 1 ? currentMonth - 1 : 12;
      const year = pastMonth === 12 ? currentYear - 1 : currentYear;

      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: pastMonth,
        expiration_year: year
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid expiration date');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with invalid expiration month - too low', async () => {
      // Arrange
      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 0, // invalid month
        expiration_year: 2025
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid expiration date');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with invalid expiration month - too high', async () => {
      // Arrange
      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 13, // invalid month
        expiration_year: 2025
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid expiration date');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with invalid security code - too short', async () => {
      // Arrange
      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: '12' // too short
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid security code format');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with invalid security code - too long', async () => {
      // Arrange
      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: '12345' // too long
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid security code format');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should fail with invalid security code - non-numeric', async () => {
      // Arrange
      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: '12a' // contains letter
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid security code format');
      expect(mockOmiseClient.createToken).not.toHaveBeenCalled();
    });

    it('should accept valid 3-digit security code', async () => {
      // Arrange
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: '123'
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242',
          expiration_month: 12,
          expiration_year: 2025,
          security_code: '123'
        }
      });
    });

    it('should accept valid 4-digit security code', async () => {
      // Arrange
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: '1234'
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242',
          expiration_month: 12,
          expiration_year: 2025,
          security_code: '1234'
        }
      });
    });

    it('should handle current month and year', async () => {
      // Arrange
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: currentMonth,
        expiration_year: currentYear
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242',
          expiration_month: currentMonth,
          expiration_year: currentYear
        }
      });
    });

    it('should handle future expiration dates', async () => {
      // Arrange
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2030
      };

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242',
          expiration_month: 12,
          expiration_year: 2030
        }
      });
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      };

      mockOmiseClient.createToken.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle unknown error', async () => {
      // Arrange
      const params = {
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      };

      mockOmiseClient.createToken.mockRejectedValue('Unknown error');

      // Act
      const result = await tokenTools.createToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('retrieveToken', () => {
    it('should retrieve a token successfully', async () => {
      // Arrange
      const mockToken = createMockToken();
      mockOmiseClient.getToken.mockResolvedValue(mockToken);

      const params = {
        token_id: 'tokn_1234567890abcdefgha'
      };

      // Act
      const result = await tokenTools.retrieveToken(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockToken);
      expect(result.message).toContain('Token retrieved successfully');
      expect(mockOmiseClient.getToken).toHaveBeenCalledWith('tokn_1234567890abcdefgha');
    });

    it('should fail with invalid token ID format', async () => {
      // Arrange
      const params = {
        token_id: 'invalid_id'
      };

      // Act
      const result = await tokenTools.retrieveToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token ID format');
      expect(mockOmiseClient.getToken).not.toHaveBeenCalled();
    });

    it('should fail with token ID too short', async () => {
      // Arrange
      const params = {
        token_id: 'tokn_123'
      };

      // Act
      const result = await tokenTools.retrieveToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token ID format');
      expect(mockOmiseClient.getToken).not.toHaveBeenCalled();
    });

    it('should fail with token ID too long', async () => {
      // Arrange
      const params = {
        token_id: 'tokn_1234567890abcdefghijklmnop'
      };

      // Act
      const result = await tokenTools.retrieveToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token ID format');
      expect(mockOmiseClient.getToken).not.toHaveBeenCalled();
    });

    it('should fail with uppercase token ID', async () => {
      // Arrange
      const params = {
        token_id: 'TOKN_1234567890ABCDEFGHA'
      };

      // Act
      const result = await tokenTools.retrieveToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token ID format');
      expect(mockOmiseClient.getToken).not.toHaveBeenCalled();
    });

    it('should fail when API call fails', async () => {
      // Arrange
      const params = {
        token_id: 'tokn_1234567890abcdefgha'
      };

      mockOmiseClient.getToken.mockRejectedValue(new Error('Token not found'));

      // Act
      const result = await tokenTools.retrieveToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token not found');
    });

    it('should handle unknown error', async () => {
      // Arrange
      const params = {
        token_id: 'tokn_1234567890abcdefgha'
      };

      mockOmiseClient.getToken.mockRejectedValue('Unknown error');

      // Act
      const result = await tokenTools.retrieveToken(params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Validation Functions', () => {
    // Test validateTokenId indirectly through retrieveToken
    describe('validateTokenId', () => {
      it('should accept valid production token ID', async () => {
        const mockToken = createMockToken();
        mockOmiseClient.getToken.mockResolvedValue(mockToken);

        const result = await tokenTools.retrieveToken({
          token_id: 'tokn_1234567890abcdefgha'
        });

        expect(result.success).toBe(true);
      });

      it('should accept valid test token ID', async () => {
        const mockToken = createMockToken();
        mockOmiseClient.getToken.mockResolvedValue(mockToken);

        const result = await tokenTools.retrieveToken({
          token_id: 'tokn_test_1234567890abcdefgha'
        });

        expect(result.success).toBe(true);
      });
    });

    // Test validateCardNumber indirectly through createToken
    describe('validateCardNumber', () => {
      const validCardNumbers = [
        '4242424242424242', // 16 digits
        '424242424242424', // 15 digits
        '42424242424242424', // 17 digits
        '424242424242424242', // 18 digits
        '4242424242424242424', // 19 digits
        '4242-4242-4242-4242', // with dashes
        '4242 4242 4242 4242', // with spaces
        '4242-4242-4242-4242', // mixed formatting
      ];

      validCardNumbers.forEach(cardNumber => {
        it(`should accept valid card number: ${cardNumber}`, async () => {
          const mockToken = createMockToken();
          mockOmiseClient.createToken.mockResolvedValue(mockToken);

          const result = await tokenTools.createToken({
            card_number: cardNumber,
            card_name: 'John Doe',
            expiration_month: 12,
            expiration_year: 2025
          });

          expect(result.success).toBe(true);
        });
      });

      const invalidCardNumbers = [
        '123456789012', // too short (12 digits)
        '12345678901234567890', // too long (20 digits)
        '4242-4242-4242-424a', // contains letter
        '4242-4242-4242-424!', // contains special character
        '', // empty
        'abc', // non-numeric
      ];

      invalidCardNumbers.forEach(cardNumber => {
        it(`should reject invalid card number: ${cardNumber}`, async () => {
          const result = await tokenTools.createToken({
            card_number: cardNumber,
            card_name: 'John Doe',
            expiration_month: 12,
            expiration_year: 2025
          });

          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid card number format');
        });
      });
    });

    // Test validateExpirationDate indirectly through createToken
    describe('validateExpirationDate', () => {
      it('should accept current month and year', async () => {
        const mockToken = createMockToken();
        mockOmiseClient.createToken.mockResolvedValue(mockToken);

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const result = await tokenTools.createToken({
          card_number: '4242424242424242',
          card_name: 'John Doe',
          expiration_month: currentMonth,
          expiration_year: currentYear
        });

        expect(result.success).toBe(true);
      });

      it('should accept future dates', async () => {
        const mockToken = createMockToken();
        mockOmiseClient.createToken.mockResolvedValue(mockToken);

        const result = await tokenTools.createToken({
          card_number: '4242424242424242',
          card_name: 'John Doe',
          expiration_month: 12,
          expiration_year: 2030
        });

        expect(result.success).toBe(true);
      });

      it('should reject past year', async () => {
        const result = await tokenTools.createToken({
          card_number: '4242424242424242',
          card_name: 'John Doe',
          expiration_month: 12,
          expiration_year: 2020
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid expiration date');
      });

      it('should reject invalid months', async () => {
        const invalidMonths = [0, 13, -1, 25];

        for (const month of invalidMonths) {
          const result = await tokenTools.createToken({
            card_number: '4242424242424242',
            card_name: 'John Doe',
            expiration_month: month,
            expiration_year: 2025
          });

          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid expiration date');
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid card number length', async () => {
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const result = await tokenTools.createToken({
        card_number: '1234567890123', // 13 digits - minimum
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      });

      expect(result.success).toBe(true);
    });

    it('should handle maximum valid card number length', async () => {
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const result = await tokenTools.createToken({
        card_number: '1234567890123456789', // 19 digits - maximum
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025
      });

      expect(result.success).toBe(true);
    });

    it('should handle card name with special characters', async () => {
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const result = await tokenTools.createToken({
        card_number: '4242424242424242',
        card_name: "Jean-Pierre O'Connor-Smith", // special characters
        expiration_month: 12,
        expiration_year: 2025
      });

      expect(result.success).toBe(true);
    });

    it('should handle very long city name', async () => {
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const longCityName = 'A'.repeat(255); // maximum length

      const result = await tokenTools.createToken({
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        city: longCityName
      });

      expect(result.success).toBe(true);
    });

    it('should handle very long postal code', async () => {
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const longPostalCode = '1'.repeat(20); // maximum length

      const result = await tokenTools.createToken({
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        postal_code: longPostalCode
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty optional parameters', async () => {
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const result = await tokenTools.createToken({
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: '',
        city: '',
        postal_code: ''
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242',
          expiration_month: 12,
          expiration_year: 2025
        }
      });
    });

    it('should handle undefined optional parameters', async () => {
      const mockToken = createMockToken();
      mockOmiseClient.createToken.mockResolvedValue(mockToken);

      const result = await tokenTools.createToken({
        card_number: '4242424242424242',
        card_name: 'John Doe',
        expiration_month: 12,
        expiration_year: 2025,
        security_code: undefined,
        city: undefined,
        postal_code: undefined
      });

      expect(result.success).toBe(true);
      expect(mockOmiseClient.createToken).toHaveBeenCalledWith({
        card: {
          name: 'John Doe',
          number: '4242424242424242',
          expiration_month: 12,
          expiration_year: 2025
        }
      });
    });
  });
});
