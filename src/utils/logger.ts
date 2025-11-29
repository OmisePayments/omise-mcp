/**
 * Logging Configuration and Utilities
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { ServerConfig } from '../types/mcp.js';

export class Logger {
  private logger: winston.Logger;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console output
    transports.push(
      new winston.transports.Console({
        level: this.config.logging.level,
        stderrLevels: ['error', 'warn', 'info', 'debug', 'verbose', 'silly'], // ALL logs to stderr for MCP
        format: this.getConsoleFormat()
      })
    );

    // File output (production environment)
    // Note: For MCP stdio servers, file logging is optional since all output goes to stderr
    if (this.config.omise.environment === 'production') {
      // Ensure logs directory exists
      const logsDir = path.resolve(process.cwd(), 'logs');
      try {
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
      } catch (error) {
        // If we can't create logs directory, skip file logging
        // This is fine for MCP stdio servers which use console/stderr
        console.warn('Could not create logs directory, file logging disabled:', error);
      }

      // Only add file transports if logs directory exists
      if (fs.existsSync(logsDir)) {
        // Error log
        transports.push(
          new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: this.getFileFormat(),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
          })
        );

        // All logs
        transports.push(
          new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: this.getFileFormat(),
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 10
          })
        );

        // Access log
        if (this.config.logging.enableRequestLogging) {
          transports.push(
            new winston.transports.File({
              filename: path.join(logsDir, 'access.log'),
              level: 'info',
              format: this.getFileFormat(),
              maxsize: 100 * 1024 * 1024, // 100MB
              maxFiles: 5
            })
          );
        }
      }
    }

    return winston.createLogger({
      level: this.config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      exitOnError: false
    });
  }

  private getConsoleFormat() {
    if (this.config.logging.format === 'json') {
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      );
    } else {
      return winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      );
    }
  }

  private getFileFormat() {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    );
  }

  // ============================================================================
  // Log Methods
  // ============================================================================

  info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  error(message: string, error: Error, ...meta: any[]): void {
    this.logger.error(message, { 
      ...meta, 
      error: error.message, 
      stack: error.stack 
    });
  }

  debug(message: string, ...meta: any[]): void {
    this.logger.debug(message, ...meta);
  }

  // ============================================================================
  // Structured Log Methods
  // ============================================================================

  /**
   * API Request Log
   */
  logRequest(method: string, url: string, headers: any, body?: any): void {
    if (this.config.logging.enableRequestLogging) {
      this.logger.info('API Request', {
        type: 'request',
        method,
        url,
        headers: this.sanitizeHeaders(headers),
        body: this.sanitizeBody(body),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * API Response Log
   */
  logResponse(method: string, url: string, status: number, headers: any, body?: any, duration?: number): void {
    if (this.config.logging.enableResponseLogging) {
      this.logger.info('API Response', {
        type: 'response',
        method,
        url,
        status,
        headers: this.sanitizeHeaders(headers),
        body: this.sanitizeBody(body),
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Error Log
   */
  logError(error: Error, context?: any): void {
    this.logger.error('Application Error', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Security Log
   */
  logSecurity(event: string, details: any): void {
    this.logger.warn('Security Event', {
      type: 'security',
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Performance Log
   */
  logPerformance(operation: string, duration: number, details?: any): void {
    this.logger.info('Performance Metric', {
      type: 'performance',
      operation,
      duration,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Business Log
   */
  logBusiness(event: string, details: any): void {
    this.logger.info('Business Event', {
      type: 'business',
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Mask sensitive information in headers
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'x-auth-token'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Mask sensitive information in body
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'secret', 'token', 'key', 'card_number', 'cvv'];
    const sanitized = JSON.parse(JSON.stringify(body));

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Dynamic log level change
   */
  setLevel(level: string): void {
    this.logger.level = level;
  }

  /**
   * Log file rotation
   */
  rotateLogs(): void {
    // Log rotation implementation
    this.logger.info('Log rotation initiated');
  }

  /**
   * Get log statistics
   */
  getLogStats(): any {
    return {
      level: this.logger.level,
      transports: this.logger.transports.length,
      timestamp: new Date().toISOString()
    };
  }
}