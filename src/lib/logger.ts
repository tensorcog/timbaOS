import pino from 'pino';

/**
 * Comprehensive production-ready logger with all log levels
 * Supports: trace, debug, info, warn, error, fatal
 */

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger with full configuration
// Note: pino-pretty transport disabled to avoid worker thread issues in Next.js
// Create logger with simple configuration to avoid worker thread issues
export const logger = pino({
  level: logLevel,
  // Disable all transport/worker thread features
  transport: undefined,
  browser: {
    asObject: false,
  },
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Log level usage guidelines:
 * 
 * - trace: Very detailed diagnostic info (function entry/exit, loop iterations)
 * - debug: Detailed debugging info (variable values, conditional branches)
 * - info: General informational messages (startup, shutdown, major operations)
 * - warn: Warning messages (deprecated APIs, recoverable errors, potential issues)
 * - error: Error messages (exceptions, failures that need attention)
 * - fatal: Critical errors that cause application shutdown
 */

// Re-export for convenience
export default logger;
