/**
 * Integration Tests for Tool Access Control
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Tool Access Control Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear module cache to allow fresh imports
    jest.resetModules();
  });

  describe('Server Startup', () => {
    it('should fail to start without TOOLS environment variable', async () => {
      // Import loadConfig dynamically to test with new environment
      const { loadConfig } = await import('../../src/utils/config');
      
      // Set required Omise env vars
      process.env = {
        OMISE_PUBLIC_KEY: 'pkey_test_123',
        OMISE_SECRET_KEY: 'skey_test_123',
        OMISE_ENVIRONMENT: 'test'
      } as any;

      expect(() => loadConfig()).toThrow("Missing required environment variable: TOOLS");
    });

    it('should fail to start with empty TOOLS environment variable', async () => {
      process.env.TOOLS = '';
      process.env.OMISE_PUBLIC_KEY = 'pkey_test_123';
      process.env.OMISE_SECRET_KEY = 'skey_test_123';
      process.env.OMISE_ENVIRONMENT = 'test';

      const { loadConfig } = await import('../../src/utils/config');
      
      expect(() => loadConfig()).toThrow('Missing required environment variable: TOOLS');
    });

    it('should fail to start with whitespace-only TOOLS', async () => {
      process.env.TOOLS = '   ';
      process.env.OMISE_PUBLIC_KEY = 'pkey_test_123';
      process.env.OMISE_SECRET_KEY = 'skey_test_123';
      process.env.OMISE_ENVIRONMENT = 'test';

      const { loadConfig } = await import('../../src/utils/config');
      
      expect(() => loadConfig()).toThrow('TOOLS environment variable is required');
    });

    it('should start successfully with TOOLS=all', async () => {
      process.env.TOOLS = 'all';
      process.env.OMISE_PUBLIC_KEY = 'pkey_test_123';
      process.env.OMISE_SECRET_KEY = 'skey_test_123';
      process.env.OMISE_ENVIRONMENT = 'test';

      const { loadConfig } = await import('../../src/utils/config');
      
      const config = loadConfig();
      expect(config.tools.allowed).toBe('all');
    });

    it('should start successfully with specific tools', async () => {
      process.env.TOOLS = 'create_charge,list_charges';
      process.env.OMISE_PUBLIC_KEY = 'pkey_test_123';
      process.env.OMISE_SECRET_KEY = 'skey_test_123';
      process.env.OMISE_ENVIRONMENT = 'test';

      const { loadConfig } = await import('../../src/utils/config');
      
      const config = loadConfig();
      expect(config.tools.allowed).toBe('create_charge,list_charges');
    });
  });

  describe('Access Control Service Integration', () => {
    it('should correctly filter tools based on allowed list', async () => {
      const { AccessControlService } = await import('../../src/auth/access-control');
      
      const service = new AccessControlService('create_charge,list_charges');
      
      const allTools = [
        { name: 'create_charge', description: 'Create charge' },
        { name: 'list_charges', description: 'List charges' },
        { name: 'update_charge', description: 'Update charge' },
        { name: 'delete_charge', description: 'Delete charge' }
      ];

      const filtered = service.filterAvailableTools(allTools);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.name)).toEqual(['create_charge', 'list_charges']);
    });

    it('should allow all tools when TOOLS=all', async () => {
      const { AccessControlService } = await import('../../src/auth/access-control');
      
      const service = new AccessControlService('all');
      
      const allTools = [
        { name: 'create_charge', description: 'Create charge' },
        { name: 'list_charges', description: 'List charges' },
        { name: 'update_charge', description: 'Update charge' }
      ];

      const filtered = service.filterAvailableTools(allTools);
      
      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(allTools);
    });

    it('should block unauthorized tool execution', async () => {
      const { AccessControlService } = await import('../../src/auth/access-control');
      
      const service = new AccessControlService('create_charge,list_charges');
      
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('delete_charge')).toBe(false);
      expect(service.isToolAllowed('update_charge')).toBe(false);
    });

    it('should allow authorized tool execution', async () => {
      const { AccessControlService } = await import('../../src/auth/access-control');
      
      const service = new AccessControlService('create_charge,list_charges,update_charge');
      
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
      expect(service.isToolAllowed('update_charge')).toBe(true);
    });
  });

  describe('Configuration Loading', () => {
    it('should load TOOLS from environment and add to config', async () => {
      process.env.TOOLS = 'create_charge,list_charges,create_customer';
      process.env.OMISE_PUBLIC_KEY = 'pkey_test_123';
      process.env.OMISE_SECRET_KEY = 'skey_test_123';
      process.env.OMISE_ENVIRONMENT = 'test';

      const { loadConfig } = await import('../../src/utils/config');
      
      const config = loadConfig();
      
      expect(config).toHaveProperty('tools');
      expect(config.tools).toHaveProperty('allowed');
      expect(config.tools.allowed).toBe('create_charge,list_charges,create_customer');
    });

    it('should maintain TOOLS configuration integrity', async () => {
      process.env.TOOLS = 'create_charge,retrieve_charge,list_charges';
      process.env.OMISE_PUBLIC_KEY = 'pkey_test_123';
      process.env.OMISE_SECRET_KEY = 'skey_test_123';
      process.env.OMISE_ENVIRONMENT = 'test';

      const { loadConfig } = await import('../../src/utils/config');
      const { AccessControlService } = await import('../../src/auth/access-control');
      
      const config = loadConfig();
      const service = new AccessControlService(config.tools.allowed);
      
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('retrieve_charge')).toBe(true);
      expect(service.isToolAllowed('list_charges')).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should support read-only access pattern', async () => {
      const { AccessControlService } = await import('../../src/auth/access-control');
      
      const service = new AccessControlService('list_charges,retrieve_charge,list_customers,retrieve_customer');
      
      // Should allow read operations
      expect(service.isToolAllowed('list_charges')).toBe(true);
      expect(service.isToolAllowed('retrieve_charge')).toBe(true);
      expect(service.isToolAllowed('list_customers')).toBe(true);
      expect(service.isToolAllowed('retrieve_customer')).toBe(true);
      
      // Should block write operations
      expect(service.isToolAllowed('create_charge')).toBe(false);
      expect(service.isToolAllowed('update_charge')).toBe(false);
      expect(service.isToolAllowed('delete_charge')).toBe(false);
      expect(service.isToolAllowed('create_customer')).toBe(false);
    });

    it('should support payment processing pattern', async () => {
      const { AccessControlService } = await import('../../src/auth/access-control');
      
      const service = new AccessControlService('create_charge,retrieve_charge,capture_charge,create_customer,create_source');
      
      // Should allow payment operations
      expect(service.isToolAllowed('create_charge')).toBe(true);
      expect(service.isToolAllowed('retrieve_charge')).toBe(true);
      expect(service.isToolAllowed('capture_charge')).toBe(true);
      expect(service.isToolAllowed('create_customer')).toBe(true);
      expect(service.isToolAllowed('create_source')).toBe(true);
      
      // Should block unrelated operations
      expect(service.isToolAllowed('create_transfer')).toBe(false);
      expect(service.isToolAllowed('create_recipient')).toBe(false);
    });

    it('should support monitoring/analytics pattern', async () => {
      const { AccessControlService } = await import('../../src/auth/access-control');
      
      const service = new AccessControlService('list_charges,list_customers,list_events');
      
      // Should allow list/read operations
      expect(service.isToolAllowed('list_charges')).toBe(true);
      expect(service.isToolAllowed('list_customers')).toBe(true);
      expect(service.isToolAllowed('list_events')).toBe(true);
      
      // Should block create/update/delete operations
      expect(service.isToolAllowed('create_charge')).toBe(false);
      expect(service.isToolAllowed('update_customer')).toBe(false);
      expect(service.isToolAllowed('delete_customer')).toBe(false);
    });
  });
});

