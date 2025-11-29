/**
 * Production-ready logging utility with structured output
 *
 * @module logger
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * // Basic logging
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Payment failed', { error, orderId: 'xyz' });
 *
 * // With context
 * const requestLogger = logger.withContext({ requestId: 'abc-123' });
 * requestLogger.info('Processing request');
 * ```
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

/**
 * Metadata that can be attached to log entries
 */
export interface LogMetadata {
    /** Error object (for error logs) */
    error?: Error | unknown;
    /** User ID associated with the action */
    userId?: string;
    /** Request ID for tracing */
    requestId?: string;
    /** Duration in milliseconds (for performance logs) */
    duration?: number;
    /** HTTP status code (for API logs) */
    statusCode?: number;
    /** Any additional structured data */
    [key: string]: unknown;
}

/**
 * Structured log entry format
 */
interface LogEntry {
    /** ISO 8601 timestamp */
    timestamp: string;
    /** Log level */
    level: LogLevel;
    /** Log message */
    message: string;
    /** Additional metadata */
    metadata?: LogMetadata;
    /** Environment (development, production, test) */
    env: string;
    /** Process ID (useful for multi-process setups) */
    pid: number;
}

/**
 * Logger configuration options
 */
interface LoggerConfig {
    /** Minimum log level to output (defaults to DEBUG in dev, INFO in prod) */
    minLevel?: LogLevel;
    /** Additional context to include in all logs */
    context?: LogMetadata;
    /** Whether to pretty print in development (defaults to true) */
    prettyPrint?: boolean;
}

/**
 * Determines if a log level should be output based on minimum level
 */
const levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
};

/**
 * ANSI color codes for pretty printing in development
 */
const levelColors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Green
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.ERROR]: '\x1b[31m', // Red
};

const RESET_COLOR = '\x1b[0m';

/**
 * Logger class for structured logging
 */
class Logger {
    private config: Required<LoggerConfig>;

    constructor(config: LoggerConfig = {}) {
        const isDevelopment = process.env.NODE_ENV === 'development';

        this.config = {
            minLevel: config.minLevel || (isDevelopment ? LogLevel.DEBUG : LogLevel.INFO),
            context: config.context || {},
            prettyPrint: config.prettyPrint ?? isDevelopment,
        };
    }

    /**
     * Creates a new logger instance with additional context
     *
     * @param context - Additional context to include in all logs
     * @returns New logger instance with merged context
     *
     * @example
     * ```typescript
     * const requestLogger = logger.withContext({ requestId: req.id });
     * requestLogger.info('Processing started');
     * requestLogger.info('Processing completed');
     * // Both logs will include requestId
     * ```
     */
    withContext(context: LogMetadata): Logger {
        return new Logger({
            ...this.config,
            context: { ...this.config.context, ...context },
        });
    }

    /**
     * Logs a debug message
     *
     * @param message - The log message
     * @param metadata - Optional metadata to attach
     *
     * @example
     * ```typescript
     * logger.debug('Cache miss', { key: 'user:123' });
     * ```
     */
    debug(message: string, metadata?: LogMetadata): void {
        this.log(LogLevel.DEBUG, message, metadata);
    }

    /**
     * Logs an info message
     *
     * @param message - The log message
     * @param metadata - Optional metadata to attach
     *
     * @example
     * ```typescript
     * logger.info('User created', { userId: '123', email: 'user@example.com' });
     * ```
     */
    info(message: string, metadata?: LogMetadata): void {
        this.log(LogLevel.INFO, message, metadata);
    }

    /**
     * Logs a warning message
     *
     * @param message - The log message
     * @param metadata - Optional metadata to attach
     *
     * @example
     * ```typescript
     * logger.warn('Rate limit approaching', { remaining: 5, limit: 100 });
     * ```
     */
    warn(message: string, metadata?: LogMetadata): void {
        this.log(LogLevel.WARN, message, metadata);
    }

    /**
     * Logs an error message
     *
     * @param message - The log message
     * @param metadata - Optional metadata to attach (should include error object)
     *
     * @example
     * ```typescript
     * try {
     *   // Some operation
     * } catch (error) {
     *   logger.error('Operation failed', { error, userId: '123' });
     * }
     * ```
     */
    error(message: string, metadata?: LogMetadata): void {
        this.log(LogLevel.ERROR, message, metadata);
    }

    /**
     * Core logging function
     */
    private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
        // Check if this log level should be output
        if (levelPriority[level] < levelPriority[this.config.minLevel]) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            metadata: { ...this.config.context, ...metadata },
            env: process.env.NODE_ENV || 'development',
            pid: process.pid,
        };

        // Output based on format preference
        if (this.config.prettyPrint) {
            this.prettyOutput(entry);
        } else {
            this.jsonOutput(entry);
        }
    }

    /**
     * Pretty print output for development
     */
    private prettyOutput(entry: LogEntry): void {
        const color = levelColors[entry.level];
        const levelStr = entry.level.toUpperCase().padEnd(5);
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();

        let output = `${color}[${levelStr}]${RESET_COLOR} ${timestamp} - ${entry.message}`;

        // Add metadata if present
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
            const metadataStr = this.formatMetadata(entry.metadata);
            output += `\n  ${metadataStr}`;
        }

        // Use console.error for ERROR and WARN, console.log for others
        if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
            console.error(output);
        } else {
            console.log(output);
        }
    }

    /**
     * JSON output for production
     */
    private jsonOutput(entry: LogEntry): void {
        // Serialize error objects properly
        const serializedEntry = {
            ...entry,
            metadata: entry.metadata ? this.serializeMetadata(entry.metadata) : undefined,
        };

        const output = JSON.stringify(serializedEntry);

        // Use console.error for ERROR and WARN, console.log for others
        if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
            console.error(output);
        } else {
            console.log(output);
        }
    }

    /**
     * Format metadata for pretty printing
     */
    private formatMetadata(metadata: LogMetadata): string {
        const parts: string[] = [];

        for (const [key, value] of Object.entries(metadata)) {
            if (value === undefined) continue;

            if (key === 'error' && value instanceof Error) {
                parts.push(`${key}: ${value.message}`);
                if (value.stack) {
                    parts.push(`stack: ${value.stack}`);
                }
            } else if (typeof value === 'object') {
                parts.push(`${key}: ${JSON.stringify(value, null, 2)}`);
            } else {
                parts.push(`${key}: ${value}`);
            }
        }

        return parts.join('\n  ');
    }

    /**
     * Serialize metadata for JSON output, handling Error objects
     */
    private serializeMetadata(metadata: LogMetadata): Record<string, unknown> {
        const serialized: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(metadata)) {
            if (value === undefined) continue;

            if (value instanceof Error) {
                serialized[key] = {
                    message: value.message,
                    name: value.name,
                    stack: value.stack,
                    ...(value as Record<string, unknown>),
                };
            } else {
                serialized[key] = value;
            }
        }

        return serialized;
    }
}

/**
 * Default logger instance for application-wide use
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('Application started');
 * logger.error('Unexpected error', { error });
 * ```
 */
export const logger = new Logger();

/**
 * Creates a performance logger that tracks operation duration
 *
 * @param operation - Name of the operation being tracked
 * @param metadata - Optional metadata to attach
 * @returns Object with start time and end function
 *
 * @example
 * ```typescript
 * const perf = performanceLogger('Database query', { table: 'users' });
 * // ... perform operation ...
 * perf.end(); // Logs duration
 * ```
 */
export function performanceLogger(operation: string, metadata?: LogMetadata) {
    const startTime = Date.now();

    return {
        /**
         * Ends the performance measurement and logs the duration
         */
        end: () => {
            const duration = Date.now() - startTime;
            logger.info(`${operation} completed`, {
                ...metadata,
                duration,
            });
        },
    };
}

/**
 * Middleware helper for logging HTTP requests
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param metadata - Optional metadata
 * @returns Logger instance with request context
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const reqLogger = requestLogger('GET', '/api/users', { userId: '123' });
 *   reqLogger.info('Request started');
 *
 *   try {
 *     // Handle request...
 *     reqLogger.info('Request completed', { statusCode: 200 });
 *   } catch (error) {
 *     reqLogger.error('Request failed', { error, statusCode: 500 });
 *   }
 * }
 * ```
 */
export function requestLogger(
    method: string,
    path: string,
    metadata?: LogMetadata
): Logger {
    return logger.withContext({
        method,
        path,
        requestId: generateRequestId(),
        ...metadata,
    });
}

/**
 * Generates a unique request ID for tracing
 */
function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log levels for external use
 */
export { LogLevel as LogLevels };
