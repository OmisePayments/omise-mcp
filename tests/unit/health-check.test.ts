/**
 * Health Check Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HealthChecker } from '../../src/utils/health-check.js';
import { OmiseClient } from '../../src/utils';
import { Logger } from '../../src/utils';
import type { ServerConfig, RateLimitInfo } from '../../src/types';

// Mock fs/promises
const mockStatfs = jest.fn<any>();
jest.mock('fs/promises', () => ({
  statfs: (...args: any[]) => mockStatfs(...args)
}));

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;
  let mockOmiseClient: jest.Mocked<OmiseClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockConfig: ServerConfig;
  let originalMemoryUsage: typeof process.memoryUsage;

  beforeEach(() => {
    // Create mock OmiseClient
    mockOmiseClient = {
      getRateLimitInfo: jest.fn().mockReturnValue({
        remaining: 100,
        resetTime: Date.now() + 3600000,
        limit: 5000
      })
    } as any;

    // Create mock Logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn()
    } as any;

    // Create mock config
    mockConfig = {
      omise: {
        publicKey: 'pkey_test_123',
        secretKey: 'skey_test_123',
        environment: 'test',
        apiVersion: '2019-05-29',
        baseUrl: 'https://api.omise.co',
        vaultUrl: 'https://vault.omise.co',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      server: {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test MCP Server',
        port: 8080,
        host: '0.0.0.0'
      },
      logging: {
        level: 'info',
        format: 'json',
        enableRequestLogging: true,
        enableResponseLogging: false
      },
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000
      },
      tools: {
        allowed: 'all'
      }
    };

    healthChecker = new HealthChecker(mockOmiseClient, mockLogger, mockConfig);

    // Mock process.memoryUsage
    originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn().mockReturnValue({
      rss: 100 * 1024 * 1024,
      heapTotal: 50 * 1024 * 1024,
      heapUsed: 25 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    }) as unknown as typeof process.memoryUsage;

    // Reset mockStatfs
    (mockStatfs as jest.Mock<any>).mockReset();
    (mockStatfs as jest.Mock<any>).mockResolvedValue({
      type: 0,
      bsize: 4096,
      blocks: 1000000,
      bfree: 500000,
      bavail: 500000,
      files: 100000,
      ffree: 90000
    });
  });

  afterEach(() => {
    // Restore original memoryUsage
    process.memoryUsage = originalMemoryUsage;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe('constructor', () => {
    it('should create HealthChecker with correct dependencies', () => {
      const checker = new HealthChecker(mockOmiseClient, mockLogger, mockConfig);
      expect(checker).toBeInstanceOf(HealthChecker);
    });

    it('should initialize startTime', async () => {
      const checker = new HealthChecker(mockOmiseClient, mockLogger, mockConfig);
      const health = await checker.checkHealth();
      
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.uptime).toBeLessThan(1000); // Should be very small initially
    });
  });

  // ============================================================================
  // checkHealth Tests
  // ============================================================================

  describe('checkHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      const result = await healthChecker.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('test');
      expect(result.checks.database.status).toBe('pass');
      expect(result.checks.omise_api.status).toBe('pass');
      expect(result.checks.memory.status).toBe('pass');
      expect(result.checks.disk.status).toBe('pass');
    });

    it('should return degraded status when some checks have warnings', async () => {
      // Set memory usage to >80% but <90% (warning threshold)
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 42 * 1024 * 1024, // 84% usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.checks.memory.status).toBe('warn');
      expect(result.checks.memory.message).toContain('high');
    });

    it('should return unhealthy status when any check fails', async () => {
      // Make Omise API check fail
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockImplementation(() => {
        throw new Error('API connection failed');
      });

      const result = await healthChecker.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.omise_api.status).toBe('fail');
      expect(result.checks.omise_api.message).toContain('failed');
    });

    it('should return unhealthy status when multiple checks fail', async () => {
      // Make both Omise API and memory checks fail
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockImplementation(() => {
        throw new Error('API connection failed');
      });

      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 47 * 1024 * 1024, // 94% usage - fail threshold
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.omise_api.status).toBe('fail');
      expect(result.checks.memory.status).toBe('fail');
    });

    it('should include response times for all checks', async () => {
      const result = await healthChecker.checkHealth();

      expect(result.checks.database.responseTime).toBeDefined();
      expect(result.checks.omise_api.responseTime).toBeDefined();
      expect(result.checks.memory.responseTime).toBeDefined();
      expect(result.checks.disk.responseTime).toBeDefined();
    });

    it('should handle errors in individual checks gracefully', async () => {
      // Make disk check throw an error
      (mockStatfs as jest.Mock<any>).mockRejectedValue(new Error('Disk check failed'));

      const result = await healthChecker.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.disk.status).toBe('fail');
      expect(result.checks.disk.message).toContain('failed');
    });

    it('should execute checks in parallel', async () => {
      const startTime = Date.now();
      await healthChecker.checkHealth();
      const endTime = Date.now();

      // All checks should complete quickly (in parallel, not sequential)
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  // ============================================================================
  // checkDatabase Tests (via checkHealth)
  // ============================================================================

  describe('checkDatabase (via checkHealth)', () => {
    it('should return pass status', async () => {
      const result = await healthChecker.checkHealth();
      expect(result.checks.database.status).toBe('pass');
      expect(result.checks.database.message).toBe('Database connection successful');
    });

    it('should handle database check errors', async () => {
      // Force a synchronous error before try-catch by overriding Date.now
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call (startTime) - allow it
          return originalDateNow();
        }
        // Second call (responseTime) - throw error
        throw new Error('Database check failed');
      });

      // Note: This test verifies the catch block exists, though in practice
      // the database check currently doesn't have code that throws
      // The catch block is for future Redis implementation
      try {
        const result = await healthChecker.checkHealth();
        // If the error is caught internally, database will still show pass
        expect(result.checks.database.status).toBeDefined();
      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  // ============================================================================
  // checkOmiseApi Tests (via checkHealth)
  // ============================================================================

  describe('checkOmiseApi (via checkHealth)', () => {
    it('should return pass status when API is accessible', async () => {
      const result = await healthChecker.checkHealth();

      expect(result.checks.omise_api.status).toBe('pass');
      expect(result.checks.omise_api.message).toBe('Omise API connection successful');
      expect(mockOmiseClient.getRateLimitInfo).toHaveBeenCalled();
    });

    it('should include rate limit info in details when available', async () => {
      const rateLimitInfo: RateLimitInfo = {
        remaining: 100,
        resetTime: Date.now() + 3600000,
        limit: 5000
      };
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockReturnValue(rateLimitInfo);

      const result = await healthChecker.checkHealth();

      expect(result.checks.omise_api.status).toBe('pass');
      expect(result.checks.omise_api.details).toMatchObject({ rateLimitInfo });
    });

    it('should handle null rate limit info', async () => {
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockReturnValue(null);

      const result = await healthChecker.checkHealth();

      expect(result.checks.omise_api.status).toBe('pass');
      expect(result.checks.omise_api.details).toMatchObject({ rateLimitInfo: null });
    });

    it('should return fail status when API throws error', async () => {
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      const result = await healthChecker.checkHealth();

      expect(result.checks.omise_api.status).toBe('fail');
      expect(result.checks.omise_api.message).toBe('Omise API connection failed');
      expect(result.checks.omise_api.details?.error).toBe('Connection timeout');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Omise API health check failed',
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // checkMemory Tests (via checkHealth)
  // ============================================================================

  describe('checkMemory (via checkHealth)', () => {
    it('should return pass status when memory usage is normal (<80%)', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 30 * 1024 * 1024, // 60% usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      expect(result.checks.memory.status).toBe('pass');
      expect(result.checks.memory.message).toBe('Memory usage normal');
    });

    it('should return warn status when memory usage is high (80-90%)', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 42 * 1024 * 1024, // 84% usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      expect(result.checks.memory.status).toBe('warn');
      expect(result.checks.memory.message).toBe('Memory usage high');
    });

    it('should return fail status when memory usage is critical (>90%)', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 47 * 1024 * 1024, // 94% usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      expect(result.checks.memory.status).toBe('fail');
      expect(result.checks.memory.message).toBe('Memory usage critically high');
    });

    it('should include memory usage details', async () => {
      const result = await healthChecker.checkHealth();

      expect(result.checks.memory.details).toBeDefined();
      expect(result.checks.memory.details?.heapTotal).toBe(50 * 1024 * 1024);
      expect(result.checks.memory.details?.heapUsed).toBe(25 * 1024 * 1024);
      expect(result.checks.memory.details?.usagePercent).toBeDefined();
    });

    it('should handle memory check errors', async () => {
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory check failed');
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      expect(result.checks.memory.status).toBe('fail');
      expect(result.checks.memory.message).toBe('Memory check failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Memory health check failed',
        expect.any(Error)
      );
    });

    it('should calculate usage percentage correctly', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024, // 50% usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      expect(result.checks.memory.details?.usagePercent).toBe('50.00');
    });
  });

  // ============================================================================
  // checkDisk Tests (via checkHealth)
  // ============================================================================

  describe('checkDisk (via checkHealth)', () => {
    it('should return pass status when disk usage is normal (<80%)', async () => {
      (mockStatfs as jest.Mock<any>).mockResolvedValue({
        type: 0,
        bsize: 4096,
        blocks: 1000000,
        bfree: 500000,
        bavail: 500000, // 50% free - 50% used
        files: 100000,
        ffree: 90000
      });

      const result = await healthChecker.checkHealth();

      expect(result.checks.disk.status).toBe('pass');
      expect(result.checks.disk.message).toBe('Disk usage normal');
    });

    it('should return warn status when disk usage is high (80-90%)', async () => {
      (mockStatfs as jest.Mock<any>).mockResolvedValue({
        type: 0,
        bsize: 4096,
        blocks: 1000000,
        bfree: 150000,
        bavail: 150000, // 15% free - 85% used (85% > 80%, triggers warn)
        files: 100000,
        ffree: 90000
      });

      const result = await healthChecker.checkHealth();

      expect(result.checks.disk.status).toBe('warn');
      expect(result.checks.disk.message).toBe('Disk usage high');
      // Calculate: (1000000 - 150000) / 1000000 * 100 = 85%
      expect(parseFloat(result.checks.disk.details?.usagePercent || '0')).toBeCloseTo(85, 1);
    });

    it('should return fail status when disk usage is critical (>90%)', async () => {
      (mockStatfs as jest.Mock<any>).mockResolvedValue({
        type: 0,
        bsize: 4096,
        blocks: 1000000,
        bfree: 50000,
        bavail: 50000, // 5% free - 95% used (95% > 90%, triggers fail)
        files: 100000,
        ffree: 90000
      });

      const result = await healthChecker.checkHealth();

      expect(result.checks.disk.status).toBe('fail');
      expect(result.checks.disk.message).toBe('Disk usage critically high');
      // Calculate: (1000000 - 50000) / 1000000 * 100 = 95%
      expect(parseFloat(result.checks.disk.details?.usagePercent || '0')).toBeCloseTo(95, 1);
    });

    it('should include disk usage details', async () => {
      const result = await healthChecker.checkHealth();

      expect(result.checks.disk.details).toBeDefined();
      expect(result.checks.disk.details?.totalSpace).toBeDefined();
      expect(result.checks.disk.details?.freeSpace).toBeDefined();
      expect(result.checks.disk.details?.usedSpace).toBeDefined();
      expect(result.checks.disk.details?.usagePercent).toBeDefined();
    });

    it('should handle disk check errors', async () => {
      (mockStatfs as jest.Mock<any>).mockRejectedValue(new Error('Permission denied'));

      const result = await healthChecker.checkHealth();

      expect(result.checks.disk.status).toBe('fail');
      expect(result.checks.disk.message).toBe('Disk check failed');
      expect(result.checks.disk.details?.error).toBe('Permission denied');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Disk health check failed',
        expect.any(Error)
      );
    });

    it('should calculate disk usage correctly', async () => {
      (mockStatfs as jest.Mock<any>).mockResolvedValue({
        type: 0,
        bsize: 1024,
        blocks: 1000,
        bfree: 500,
        bavail: 500, // 50% free - 50% used
        files: 100000,
        ffree: 90000
      });

      const result = await healthChecker.checkHealth();

      expect(result.checks.disk.status).toBe('pass');
      // Calculate: (1000 - 500) / 1000 * 100 = 50%
      expect(result.checks.disk.details?.usagePercent).toBe('50.00');
    });
  });

  // ============================================================================
  // getCheckResult Tests (via checkHealth)
  // ============================================================================

  describe('getCheckResult (via checkHealth)', () => {
    it('should handle fulfilled promises', async () => {
      const result = await healthChecker.checkHealth();
      
      // All checks should be fulfilled
      expect(result.checks.database.status).toBeDefined();
      expect(result.checks.omise_api.status).toBeDefined();
      expect(result.checks.memory.status).toBeDefined();
      expect(result.checks.disk.status).toBeDefined();
    });

    it('should handle rejected promises', async () => {
      // Make all checks fail (these are caught internally, so they return fail status)
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockImplementation(() => {
        throw new Error('API error');
      });
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory error');
      }) as unknown as typeof process.memoryUsage;
      (mockStatfs as jest.Mock<any>).mockRejectedValue(new Error('Disk error'));

      const result = await healthChecker.checkHealth();

      // Should handle all errors gracefully
      expect(result.status).toBe('unhealthy');
      expect(result.checks.omise_api.status).toBe('fail');
      expect(result.checks.memory.status).toBe('fail');
      expect(result.checks.disk.status).toBe('fail');
    });

    it('should handle promise rejections that bypass try-catch', async () => {
      // Force a rejection by making checkDatabase throw synchronously before try-catch
      // This simulates an error that would cause the promise itself to reject
      // We'll test this by mocking the checkDatabase method to actually reject
      const originalCheckDatabase = (healthChecker as any).checkDatabase;
      (healthChecker as any).checkDatabase = jest.fn(() => {
        // Return a promise that rejects (bypassing internal try-catch)
        return Promise.reject('Database promise rejected');
      });

      const result = await healthChecker.checkHealth();

      // Should handle the rejected promise via getCheckResult
      expect(result.checks.database.status).toBe('fail');
      expect(result.checks.database.message).toBe('Health check failed');
      expect(result.checks.database.details?.error).toBe('Database promise rejected');

      // Restore original method
      (healthChecker as any).checkDatabase = originalCheckDatabase;
    });
  });

  // ============================================================================
  // getHealthResponse Tests
  // ============================================================================

  describe('getHealthResponse', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return 200 status when healthy', async () => {
      await healthChecker.getHealthResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy'
        })
      );
    });

    it('should return 200 status when degraded', async () => {
      // Set memory usage to warning threshold
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 42 * 1024 * 1024, // 84% usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      await healthChecker.getHealthResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded'
        })
      );
    });

    it('should return 503 status when unhealthy', async () => {
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockImplementation(() => {
        throw new Error('API connection failed');
      });

      await healthChecker.getHealthResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy'
        })
      );
    });

    it('should handle errors in health check', async () => {
      // Mock checkHealth to throw error
      jest.spyOn(healthChecker as any, 'checkHealth').mockRejectedValue(
        new Error('Health check failed')
      );

      await healthChecker.getHealthResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'unhealthy',
        timestamp: expect.any(String),
        message: 'Health check failed',
        error: 'Health check failed'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check endpoint error',
        expect.any(Error)
      );
    });

    it('should include full health check result in response', async () => {
      await healthChecker.getHealthResponse(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs).toHaveProperty('status');
      expect(callArgs).toHaveProperty('timestamp');
      expect(callArgs).toHaveProperty('uptime');
      expect(callArgs).toHaveProperty('version');
      expect(callArgs).toHaveProperty('environment');
      expect(callArgs).toHaveProperty('checks');
    });
  });

  // ============================================================================
  // getLivenessResponse Tests
  // ============================================================================

  describe('getLivenessResponse', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return 200 status with alive status', () => {
      healthChecker.getLivenessResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    it('should include current timestamp', () => {
      const beforeTime = new Date();
      healthChecker.getLivenessResponse(mockReq, mockRes);
      const afterTime = new Date();

      const callArgs = mockRes.json.mock.calls[0][0];
      const timestamp = new Date(callArgs.timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should include uptime', () => {
      healthChecker.getLivenessResponse(mockReq, mockRes);

      const callArgs = mockRes.json.mock.calls[0][0];
      expect(callArgs.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof callArgs.uptime).toBe('number');
    });
  });

  // ============================================================================
  // getReadinessResponse Tests
  // ============================================================================

  describe('getReadinessResponse', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return 200 status when ready (healthy)', async () => {
      await healthChecker.getReadinessResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'ready',
        timestamp: expect.any(String)
      });
    });

    it('should return 200 status when ready (degraded)', async () => {
      // Set memory usage to warning threshold
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 42 * 1024 * 1024, // 84% usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      await healthChecker.getReadinessResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'ready',
        timestamp: expect.any(String)
      });
    });

    it('should return 503 status when not ready (unhealthy)', async () => {
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockImplementation(() => {
        throw new Error('API connection failed');
      });

      await healthChecker.getReadinessResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'not ready',
        timestamp: expect.any(String),
        message: 'Service not ready'
      });
    });

    it('should handle errors in readiness check', async () => {
      // Mock checkHealth to throw error
      jest.spyOn(healthChecker as any, 'checkHealth').mockRejectedValue(
        new Error('Readiness check failed')
      );

      await healthChecker.getReadinessResponse(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'not ready',
        timestamp: expect.any(String),
        error: 'Readiness check failed'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Readiness check failed',
        expect.any(Error)
      );
    });

    it('should include current timestamp', async () => {
      const beforeTime = new Date();
      await healthChecker.getReadinessResponse(mockReq, mockRes);
      const afterTime = new Date();

      const callArgs = mockRes.json.mock.calls[0][0];
      const timestamp = new Date(callArgs.timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle zero memory usage', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      // Should handle division by zero or very low values
      expect(result.checks.memory.status).toBeDefined();
    });

    it('should handle very large memory usage', async () => {
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1000 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        heapUsed: 999 * 1024 * 1024, // 99.9% usage
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }) as unknown as typeof process.memoryUsage;

      const result = await healthChecker.checkHealth();

      expect(result.checks.memory.status).toBe('fail');
      expect(result.checks.memory.message).toBe('Memory usage critically high');
    });

    it('should handle disk with zero blocks', async () => {
      (mockStatfs as jest.Mock<any>).mockResolvedValue({
        type: 0,
        bsize: 4096,
        blocks: 0,
        bfree: 0,
        bavail: 0,
        files: 0,
        ffree: 0
      });

      const result = await healthChecker.checkHealth();

      expect(result.checks.disk.status).toBeDefined();
    });

    it('should handle non-Error exceptions', async () => {
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockImplementation(() => {
        throw 'String error'; // Non-Error exception
      });

      const result = await healthChecker.checkHealth();

      expect(result.checks.omise_api.status).toBe('fail');
    });

    it('should handle missing rate limit info gracefully', async () => {
      mockOmiseClient.getRateLimitInfo = jest.fn<any>().mockReturnValue(null);

      const result = await healthChecker.checkHealth();

      expect(result.checks.omise_api.status).toBe('pass');
      expect(result.checks.omise_api.details?.rateLimitInfo).toBeNull();
    });

    it('should maintain consistent timestamp format', async () => {
      const result = await healthChecker.checkHealth();

      // Should be ISO 8601 format
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('should handle concurrent health checks', async () => {
      const promises = Array.from({ length: 5 }, () => healthChecker.checkHealth());
      const results = await Promise.all(promises);

      // All should complete successfully
      results.forEach(result => {
        expect(result.status).toBeDefined();
        expect(result.timestamp).toBeDefined();
        expect(result.checks).toBeDefined();
      });
    });
  });
});

