import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

/**
 * Error classification utility for API routes
 * Converts various error types into appropriate HTTP responses
 */

export interface ApiErrorResponse {
    status: number;
    error: string;
    details?: any;
}

export function classifyError(error: unknown): ApiErrorResponse {
    // Validation errors (Zod)
    if (error instanceof ZodError) {
        return {
            status: 400,
            error: 'Validation failed',
            details: error.format(),
        };
    }

    // Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002': // Unique constraint violation
                return {
                    status: 409,
                    error: 'Conflict - Record already exists',
                    details: `Unique constraint failed on: ${error.meta?.target}`,
                };

            case 'P2003': // Foreign key constraint violation
                return {
                    status: 400,
                    error: 'Invalid reference',
                    details: 'Referenced record does not exist',
                };

            case 'P2025': // Record not found
                return {
                    status: 404,
                    error: 'Record not found',
                    details: error.meta?.cause || 'The requested resource was not found',
                };

            case 'P2014': // Required relation violation
                return {
                    status: 400,
                    error: 'Invalid data',
                    details: 'Required relation missing',
                };

            default:
                return {
                    status: 500,
                    error: 'Database error',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                };
        }
    }

    // Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
        return {
            status: 400,
            error: 'Invalid data format',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        };
    }

    // Custom application errors (if thrown with new Error())
    if (error instanceof Error) {
        // Check for specific error messages
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
            return {
                status: 404,
                error: 'Not found',
                details: error.message,
            };
        }

        if (error.message.includes('unauthorized') || error.message.includes('permission')) {
            return {
                status: 403,
                error: 'Forbidden',
                details: error.message,
            };
        }

        if (error.message.includes('invalid') || error.message.includes('required')) {
            return {
                status: 400,
                error: 'Bad request',
                details: error.message,
            };
        }

        // Generic error
        return {
            status: 500,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        };
    }

    // Unknown error type
    return {
        status: 500,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    };
}

/**
 * Helper to log errors with context
 */
export function logError(error: unknown, context: string) {
    console.error(`[${context}]`, error);

    // In production, you might want to send this to an error tracking service
    // like Sentry, DataDog, etc.
    // if (process.env.NODE_ENV === 'production') {
    //     Sentry.captureException(error, { tags: { context } });
    // }
}
