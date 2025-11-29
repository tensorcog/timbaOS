import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
    count: number;
    resetTime: number;
}

const store = new Map<string, RateLimitStore>();

/**
 * Lazy cleanup function that removes expired rate limit records
 */
function cleanupExpiredRecords() {
    const now = Date.now();
    for (const [key, value] of Array.from(store.entries())) {
        if (now > value.resetTime) {
            store.delete(key);
        }
    }
}

let requestCount = 0;

export interface RateLimitConfig {
    maxRequests: number;
    windowSeconds: number;
    identifier?: (request: NextRequest) => string;
}

/**
 * Rate limiter middleware for API routes using a sliding window algorithm
 */
export async function rateLimit(
    request: NextRequest,
    config: RateLimitConfig
): Promise<{
    limited: boolean;
    response?: NextResponse;
    remaining: number;
}> {
    // Perform lazy cleanup every 100 requests to prevent memory growth
    if (++requestCount % 100 === 0) {
        cleanupExpiredRecords();
    }

    const identifier = config.identifier
        ? config.identifier(request)
        : getClientIdentifier(request);

    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;

    let record = store.get(identifier);

    if (!record || now > record.resetTime) {
        record = {
            count: 1,
            resetTime: now + windowMs,
        };
        store.set(identifier, record);

        return {
            limited: false,
            remaining: config.maxRequests - 1,
        };
    }

    record.count++;

    if (record.count > config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);

        return {
            limited: true,
            remaining: 0,
            response: NextResponse.json(
                {
                    error: 'Too many requests',
                    message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
                    retryAfter,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': config.maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
                    },
                }
            ),
        };
    }

    return {
        limited: false,
        remaining: config.maxRequests - record.count,
    };
}

function getClientIdentifier(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || '';

    return `${userAgent}-${acceptLanguage}`.substring(0, 100);
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RateLimitPresets = {
    /** 5 requests per minute - for authentication endpoints */
    AUTH: {
        maxRequests: 5,
        windowSeconds: 60,
    },

    /** 10 requests per minute - for sensitive operations */
    STRICT: {
        maxRequests: 10,
        windowSeconds: 60,
    },

    /** 100 requests per minute - for general API usage */
    STANDARD: {
        maxRequests: 100,
        windowSeconds: 60,
    },

    /** 1000 requests per minute - for high-volume endpoints */
    GENEROUS: {
        maxRequests: 1000,
        windowSeconds: 60,
    },
} as const;
