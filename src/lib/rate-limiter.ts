import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
    count: number;
    resetTime: number;
}

// In-memory store for rate limiting (use Redis in production for distributed systems)
const store = new Map<string, RateLimitStore>();

// Clean up old entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
        if (now > value.resetTime) {
            store.delete(key);
        }
    }
}, 10 * 60 * 1000);

export interface RateLimitConfig {
    /**
     * Maximum number of requests allowed within the window
     */
    maxRequests: number;

    /**
     * Time window in seconds
     */
    windowSeconds: number;

    /**
     * Custom identifier function (defaults to IP address)
     */
    identifier?: (request: NextRequest) => string;
}

/**
 * Rate limiter middleware for API routes
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, {
 *     maxRequests: 5,
 *     windowSeconds: 60
 *   });
 *
 *   if (rateLimitResult.limited) {
 *     return rateLimitResult.response;
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
export async function rateLimit(
    request: NextRequest,
    config: RateLimitConfig
): Promise<{
    limited: boolean;
    response?: NextResponse;
    remaining: number;
}> {
    const identifier = config.identifier
        ? config.identifier(request)
        : getClientIdentifier(request);

    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;

    let record = store.get(identifier);

    if (!record || now > record.resetTime) {
        // Create new record
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

    // Increment count
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

/**
 * Get client identifier from request (IP address or fallback)
 */
function getClientIdentifier(request: NextRequest): string {
    // Try to get real IP from headers (considering proxies)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback to a combination of headers for uniqueness
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
