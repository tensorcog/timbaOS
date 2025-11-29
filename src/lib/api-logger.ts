import logger from './logger';

/**
 * Helper functions for consistent API error logging
 */

export function logApiError(
    context: string,
    error: unknown,
    metadata?: Record<string, unknown>
) {
    logger.error(
        {
            error: error instanceof Error ? error : new Error(String(error)),
            ...metadata,
        },
        `[${context}] Error occurred`
    );
}

export function logApiWarning(
    context: string,
    message: string,
    metadata?: Record<string, unknown>
) {
    logger.warn({ ...metadata }, `[${context}] ${message}`);
}

export function logApiInfo(
    context: string,
    message: string,
    metadata?: Record<string, unknown>
) {
    logger.info({ ...metadata }, `[${context}] ${message}`);
}
