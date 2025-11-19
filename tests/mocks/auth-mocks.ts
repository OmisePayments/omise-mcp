/**
 * Test Mocks and Utilities
 */

import { jest } from '@jest/globals';
import { Logger } from '../../src/utils';

// Mock Logger
export const createMockLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
} as any);
