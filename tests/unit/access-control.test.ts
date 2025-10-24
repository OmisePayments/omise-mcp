/**
 * Unit Tests for Access Control Service
 */

import { describe, it, expect } from '@jest/globals';
import { AccessControlService } from '../../src/auth/access-control';

describe('AccessControlService', () => {
  describe('constructor validation', () => {
    it('should throw error when TOOLS is empty', () => {
      expect(() => new AccessControlService('')).toThrow('TOOLS environment variable is required');
    });
    
    it('should throw error when TOOLS is whitespace', () => {
      expect(() => new AccessControlService('   ')).toThrow('TOOLS environment variable is required');
    });
    
    it('should accept "all" keyword', () => {
      const service = new AccessControlService('all');
      expect(service.isToolAllowed('any_tool')).toBe(true);
      expect(service.isToolAllowed('another_tool')).toBe(true);
    });

    it('should accept "ALL" keyword (case insensitive)', () => {
      const service = new AccessControlService('ALL');
      expect(service.isToolAllowed('any_tool')).toBe(true);
    });

    it('should throw error when tool list is empty after splitting', () => {
      expect(() => new AccessControlService(',')).toThrow('TOOLS must contain at least one tool name or "all"');
    });
  });
  
  describe('tool parsing', () => {
    it('should parse comma-separated tools', () => {
      const service = new AccessControlService('create_charge,list_charges');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
      expect(service.isToolAllowed('delete_charge')).toBe(false);
    });
    
    it('should handle whitespace in tool list', () => {
      const service = new AccessControlService(' create_charge , list_charges ');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
    });

    it('should handle single tool', () => {
      const service = new AccessControlService('create_charge');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(false);
    });

    it('should handle multiple tools with various spacing', () => {
      const service = new AccessControlService('create_charge,list_charges,  retrieve_charge  ,update_charge');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
      expect(service.isToolAllowed('retrieve_charge')).toBe(true);
      expect(service.isToolAllowed('update_charge')).toBe(true);
      expect(service.isToolAllowed('delete_charge')).toBe(false);
    });

    it('should ignore empty entries in comma-separated list', () => {
      const service = new AccessControlService('create_charge,,list_charges');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
    });
  });
  
  describe('isToolAllowed', () => {
    it('should return true for allowed tools', () => {
      const service = new AccessControlService('create_charge,list_charges');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
    });

    it('should return false for disallowed tools', () => {
      const service = new AccessControlService('create_charge,list_charges');
      expect(service.isToolAllowed('delete_charge')).toBe(false);
      expect(service.isToolAllowed('update_charge')).toBe(false);
    });

    it('should perform exact match only', () => {
      const service = new AccessControlService('create_charge');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('create_charges')).toBe(false);
      expect(service.isToolAllowed('create_')).toBe(false);
    });

    it('should return true for all tools when TOOLS=all', () => {
      const service = new AccessControlService('all');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
      expect(service.isToolAllowed('delete_charge')).toBe(true);
      expect(service.isToolAllowed('random_tool')).toBe(true);
    });
  });
  
  describe('filterAvailableTools', () => {
    it('should filter tools correctly', () => {
      const allTools = [
        { name: 'create_charge', description: 'Create a charge' },
        { name: 'list_charges', description: 'List charges' },
        { name: 'create_customer', description: 'Create a customer' }
      ];
      
      const service = new AccessControlService('create_charge,list_charges');
      const filtered = service.filterAvailableTools(allTools);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.name)).toEqual(['create_charge', 'list_charges']);
    });

    it('should return all tools when TOOLS=all', () => {
      const allTools = [
        { name: 'create_charge', description: 'Create a charge' },
        { name: 'list_charges', description: 'List charges' },
        { name: 'create_customer', description: 'Create a customer' }
      ];
      
      const service = new AccessControlService('all');
      const filtered = service.filterAvailableTools(allTools);
      
      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(allTools);
    });

    it('should return empty array when no tools are allowed', () => {
      const allTools = [
        { name: 'create_charge', description: 'Create a charge' },
        { name: 'list_charges', description: 'List charges' }
      ];
      
      const service = new AccessControlService('create_customer');
      const filtered = service.filterAvailableTools(allTools);
      
      expect(filtered).toHaveLength(0);
    });

    it('should preserve tool properties', () => {
      const allTools = [
        { name: 'create_charge', description: 'Create a charge', schema: {} }
      ];
      
      const service = new AccessControlService('create_charge');
      const filtered = service.filterAvailableTools(allTools);
      
      expect(filtered[0]).toHaveProperty('name', 'create_charge');
      expect(filtered[0]).toHaveProperty('description', 'Create a charge');
      expect(filtered[0]).toHaveProperty('schema');
    });
  });

  describe('getConfigSummary', () => {
    it('should return "all tools" when TOOLS=all', () => {
      const service = new AccessControlService('all');
      expect(service.getConfigSummary()).toBe('all tools');
    });

    it('should return tool count and list for specific tools', () => {
      const service = new AccessControlService('create_charge,list_charges');
      const summary = service.getConfigSummary();
      expect(summary).toContain('2 tools');
      expect(summary).toContain('create_charge');
      expect(summary).toContain('list_charges');
    });

    it('should return correct count for single tool', () => {
      const service = new AccessControlService('create_charge');
      const summary = service.getConfigSummary();
      expect(summary).toContain('1 tools');
      expect(summary).toContain('create_charge');
    });
  });

  describe('getAllowedTools', () => {
    it('should return "all" when TOOLS=all', () => {
      const service = new AccessControlService('all');
      expect(service.getAllowedTools()).toBe('all');
    });

    it('should return array of tool names', () => {
      const service = new AccessControlService('create_charge,list_charges');
      const allowed = service.getAllowedTools();
      expect(Array.isArray(allowed)).toBe(true);
      if (Array.isArray(allowed)) {
        expect(allowed).toEqual(['create_charge', 'list_charges']);
      }
    });
  });

  describe('tool validation', () => {
    it('should throw error for invalid tool names', () => {
      expect(() => new AccessControlService('hello,invalid_tool')).toThrow('Invalid tool names: hello, invalid_tool');
    });

    it('should throw error for mixed valid and invalid tools', () => {
      expect(() => new AccessControlService('create_charge,hello,list_charges')).toThrow('Invalid tool names: hello');
    });

    it('should accept valid tool names', () => {
      const service = new AccessControlService('create_charge,list_charges,create_customer');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
      expect(service.isToolAllowed('create_customer')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should be case-sensitive for tool names', () => {
      const service = new AccessControlService('create_charge');
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('CREATE_CHARGE')).toBe(false);
      expect(service.isToolAllowed('Create_Charge')).toBe(false);
    });
  });
});

