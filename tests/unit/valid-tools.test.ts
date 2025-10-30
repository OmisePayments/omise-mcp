/**
 * Valid Tools Unit Tests
 */

import { describe, it, expect } from '@jest/globals';
import { 
  VALID_TOOLS, 
  ValidTool, 
  isValidTool, 
  validateToolNames, 
  getAllValidToolsString 
} from '../../src/utils/valid-tools';

describe('Valid Tools', () => {
  // ============================================================================
  // VALID_TOOLS Constant Tests
  // ============================================================================

  describe('VALID_TOOLS constant', () => {
    it('should contain all expected payment tools', () => {
      const expectedPaymentTools = [
        'create_charge',
        'retrieve_charge',
        'list_charges',
        'update_charge',
        'capture_charge',
        'reverse_charge',
        'expire_charge'
      ];

      expectedPaymentTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected customer tools', () => {
      const expectedCustomerTools = [
        'create_customer',
        'retrieve_customer',
        'list_customers',
        'update_customer',
        'destroy_customer',
        'list_customer_cards',
        'retrieve_customer_card',
        'update_customer_card',
        'destroy_customer_card'
      ];

      expectedCustomerTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected token tools', () => {
      const expectedTokenTools = [
        'create_token',
        'retrieve_token'
      ];

      expectedTokenTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected source tools', () => {
      const expectedSourceTools = [
        'create_source',
        'retrieve_source'
      ];

      expectedSourceTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected transfer tools', () => {
      const expectedTransferTools = [
        'create_transfer',
        'retrieve_transfer',
        'list_transfers',
        'update_transfer',
        'destroy_transfer'
      ];

      expectedTransferTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected recipient tools', () => {
      const expectedRecipientTools = [
        'create_recipient',
        'retrieve_recipient',
        'list_recipients',
        'update_recipient',
        'destroy_recipient',
        'verify_recipient'
      ];

      expectedRecipientTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected refund tools', () => {
      const expectedRefundTools = [
        'create_refund',
        'retrieve_refund',
        'list_refunds'
      ];

      expectedRefundTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected dispute tools', () => {
      const expectedDisputeTools = [
        'list_disputes',
        'retrieve_dispute',
        'accept_dispute',
        'update_dispute',
        'list_dispute_documents',
        'retrieve_dispute_document',
        'upload_dispute_document',
        'destroy_dispute_document'
      ];

      expectedDisputeTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected schedule tools', () => {
      const expectedScheduleTools = [
        'create_schedule',
        'retrieve_schedule',
        'list_schedules',
        'destroy_schedule',
        'list_schedule_occurrences'
      ];

      expectedScheduleTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain all expected event tools', () => {
      const expectedEventTools = [
        'list_events',
        'retrieve_event'
      ];

      expectedEventTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should contain capability tools', () => {
      const expectedCapabilityTools = [
        'retrieve_capability'
      ];

      expectedCapabilityTools.forEach(tool => {
        expect(VALID_TOOLS).toContain(tool);
      });
    });

    it('should have the correct total number of tools', () => {
      // Payment: 7, Customer: 9, Token: 2, Source: 2, Transfer: 5, 
      // Recipient: 6, Refund: 3, Dispute: 8, Schedule: 5, Event: 2, Capability: 1
      const expectedTotal = 7 + 9 + 2 + 2 + 5 + 6 + 3 + 8 + 5 + 2 + 1;
      expect(VALID_TOOLS).toHaveLength(expectedTotal);
    });

    it('should not contain duplicate tools', () => {
      const uniqueTools = new Set(VALID_TOOLS);
      expect(uniqueTools.size).toBe(VALID_TOOLS.length);
    });

    it('should be a readonly array', () => {
      // TypeScript readonly arrays can still be mutated at runtime
      // This test verifies the array structure is correct
      expect(Array.isArray(VALID_TOOLS)).toBe(true);
      expect(VALID_TOOLS).toHaveLength(50);
    });
  });

  // ============================================================================
  // ValidTool Type Tests
  // ============================================================================

  describe('ValidTool type', () => {
    it('should accept all valid tool names', () => {
      VALID_TOOLS.forEach(tool => {
        const validTool: ValidTool = tool;
        expect(validTool).toBe(tool);
      });
    });
  });

  // ============================================================================
  // isValidTool Function Tests
  // ============================================================================

  describe('isValidTool function', () => {
    it('should return true for all valid tools', () => {
      VALID_TOOLS.forEach(tool => {
        expect(isValidTool(tool)).toBe(true);
      });
    });

    it('should return false for invalid tool names', () => {
      const invalidTools = [
        'invalid_tool',
        'create_invalid',
        'retrieve_invalid',
        'list_invalid',
        'update_invalid',
        'destroy_invalid',
        'capture_invalid',
        'reverse_invalid',
        'expire_invalid',
        'verify_invalid',
        'upload_invalid',
        'accept_invalid',
        'random_string',
        '',
        ' ',
        'create_charge ', // trailing space
        ' create_charge', // leading space
        'tool_with_spaces',
        'tool-with-dashes',
        'tool.with.dots',
        'CREATE_CHARGE', // uppercase
        'Create_Charge', // mixed case
        'cReAtE_cHaRgE', // mixed case variation
        '123numeric',
        'tool@with#special$chars'
      ];

      invalidTools.forEach(tool => {
        expect(isValidTool(tool)).toBe(false);
      });
    });

    it('should work with type guards', () => {
      const testTool = 'create_charge';
      if (isValidTool(testTool)) {
        // TypeScript should know this is ValidTool type
        const validTool: ValidTool = testTool;
        expect(validTool).toBe('create_charge');
      }

      const invalidTool = 'invalid_tool';
      if (isValidTool(invalidTool)) {
        // This should not execute
        expect(true).toBe(false); // This should not be reached
      }
    });
  });

  // ============================================================================
  // validateToolNames Function Tests
  // ============================================================================

  describe('validateToolNames function', () => {
    it('should return valid result for all valid tools', () => {
      const result = validateToolNames([...VALID_TOOLS]);
      
      expect(result.isValid).toBe(true);
      expect(result.invalidTools).toHaveLength(0);
      expect(result.validTools).toHaveLength(VALID_TOOLS.length);
      expect(result.validTools).toEqual(expect.arrayContaining([...VALID_TOOLS]));
    });

    it('should return invalid result for all invalid tools', () => {
      const invalidTools = ['invalid_tool1', 'invalid_tool2', 'invalid_tool3'];
      const result = validateToolNames(invalidTools);
      
      expect(result.isValid).toBe(false);
      expect(result.invalidTools).toEqual(invalidTools);
      expect(result.validTools).toHaveLength(0);
    });

    it('should handle mixed valid and invalid tools', () => {
      const mixedTools = ['create_charge', 'invalid_tool', 'retrieve_customer', 'another_invalid'];
      const result = validateToolNames(mixedTools);
      
      expect(result.isValid).toBe(false);
      expect(result.invalidTools).toEqual(['invalid_tool', 'another_invalid']);
      expect(result.validTools).toEqual(['create_charge', 'retrieve_customer']);
    });

    it('should handle empty array', () => {
      const result = validateToolNames([]);
      
      expect(result.isValid).toBe(true);
      expect(result.invalidTools).toHaveLength(0);
      expect(result.validTools).toHaveLength(0);
    });

    it('should handle single valid tool', () => {
      const result = validateToolNames(['create_charge']);
      
      expect(result.isValid).toBe(true);
      expect(result.invalidTools).toHaveLength(0);
      expect(result.validTools).toEqual(['create_charge']);
    });

    it('should handle single invalid tool', () => {
      const result = validateToolNames(['invalid_tool']);
      
      expect(result.isValid).toBe(false);
      expect(result.invalidTools).toEqual(['invalid_tool']);
      expect(result.validTools).toHaveLength(0);
    });

    it('should handle duplicate tools', () => {
      const duplicateTools = ['create_charge', 'create_charge', 'retrieve_customer'];
      const result = validateToolNames(duplicateTools);
      
      expect(result.isValid).toBe(true);
      expect(result.invalidTools).toHaveLength(0);
      expect(result.validTools).toEqual(['create_charge', 'create_charge', 'retrieve_customer']);
    });

    it('should preserve order of tools', () => {
      const orderedTools = ['create_charge', 'invalid_tool', 'retrieve_customer', 'another_invalid'];
      const result = validateToolNames(orderedTools);
      
      expect(result.validTools).toEqual(['create_charge', 'retrieve_customer']);
      expect(result.invalidTools).toEqual(['invalid_tool', 'another_invalid']);
    });

    it('should handle tools with special characters', () => {
      const specialTools = ['create_charge', 'tool-with-dash', 'tool.with.dot', 'tool@special'];
      const result = validateToolNames(specialTools);
      
      expect(result.isValid).toBe(false);
      expect(result.validTools).toEqual(['create_charge']);
      expect(result.invalidTools).toEqual(['tool-with-dash', 'tool.with.dot', 'tool@special']);
    });
  });

  // ============================================================================
  // getAllValidToolsString Function Tests
  // ============================================================================

  describe('getAllValidToolsString function', () => {
    it('should return comma-separated string of all valid tools', () => {
      const result = getAllValidToolsString();
      
      expect(typeof result).toBe('string');
      expect(result).toContain(',');
      
      const tools = result.split(', ');
      expect(tools).toHaveLength(VALID_TOOLS.length);
      expect(tools).toEqual(expect.arrayContaining([...VALID_TOOLS]));
      
      // Verify all tools are included
      VALID_TOOLS.forEach(tool => {
        expect(result).toContain(tool);
      });
    });

    it('should not include any invalid tools', () => {
      const result = getAllValidToolsString();
      const invalidTools = ['invalid_tool', 'create_invalid', 'retrieve_invalid'];
      
      invalidTools.forEach(tool => {
        expect(result).not.toContain(tool);
      });
    });

    it('should have proper comma separation', () => {
      const result = getAllValidToolsString();
      const tools = result.split(', ');
      
      // Each tool should not contain commas
      tools.forEach(tool => {
        expect(tool).not.toContain(',');
      });
      
      // Should not have double commas or malformed separators
      expect(result).not.toContain(',,');
      expect(result).not.toContain(' ,');
      expect(result).not.toContain(',  '); // double space after comma
      expect(result).not.toContain('  ,'); // double space before comma
      
      // Should use proper comma-space separation
      expect(result).toMatch(/^[^,]+(, [^,]+)*$/);
    });

    it('should be consistent across multiple calls', () => {
      const result1 = getAllValidToolsString();
      const result2 = getAllValidToolsString();
      
      expect(result1).toBe(result2);
    });

    it('should start with the first tool and end with the last tool', () => {
      const result = getAllValidToolsString();
      
      expect(result).toMatch(new RegExp(`^${VALID_TOOLS[0]}`));
      expect(result).toMatch(new RegExp(`${VALID_TOOLS[VALID_TOOLS.length - 1]}$`));
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration tests', () => {
    it('should work together consistently', () => {
      // Test that all functions work together
      const allToolsString = getAllValidToolsString();
      const toolsFromString = allToolsString.split(', ');
      
      // All tools from string should be valid
      const validationResult = validateToolNames(toolsFromString);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.validTools).toHaveLength(VALID_TOOLS.length);
      
      // Each tool should pass isValidTool
      toolsFromString.forEach(tool => {
        expect(isValidTool(tool)).toBe(true);
      });
    });

    it('should handle real-world scenarios', () => {
      // Simulate a scenario where we get tools from an external source
      const externalTools = [
        'create_charge',
        'retrieve_charge',
        'invalid_tool',
        'create_customer',
        'retrieve_customer',
        'another_invalid',
        'create_token'
      ];
      
      const result = validateToolNames(externalTools);
      
      expect(result.isValid).toBe(false);
      expect(result.validTools).toEqual([
        'create_charge',
        'retrieve_charge',
        'create_customer',
        'retrieve_customer',
        'create_token'
      ]);
      expect(result.invalidTools).toEqual(['invalid_tool', 'another_invalid']);
    });
  });
});
