import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limit tracking record for a single client identifier
 * @internal
 */
interface RateLimitStore {
    /** Current number of requests made within the time window */
    count: number;
    /** Timestamp (in milliseconds) when the rate limit window resets */
    resetTime: number;
}

/**
 * In-memory store for rate limiting tracking
 *
 * @remarks
 * This implementation uses an in-memory Map for simplicity and zero-dependency operation.
 * For production deployments with multiple servers, consider migrating to Redis or another
 * distributed cache to share rate limits across instances.
 *
 * @see {@link RateLimitStore} for the structure of stored records
 */
const store = new Map<string, RateLimitStore>();

/**
 * Automatic cleanup interval that removes expired rate limit records
 *
 * Runs every 10 minutes to prevent memory leaks by deleting records
 * that have passed their reset time. This ensures the Map doesn't
 * grow unbounded in long-running processes.
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
        if (now > value.resetTime) {
            store.delete(key);
        }
    }
}, 10 * 60 * 1000);

/**
 * Configuration options for rate limiting
 *
 * @example
 * ```typescript
 * const config: RateLimitConfig = {
 *   maxRequests: 100,
 *   windowSeconds: 60,
 *   identifier: (req) => req.headers.get('x-api-key') || 'anonymous'
 * };
 * ```
 */
export interface RateLimitConfig {
    /**
     * Maximum number of requests allowed within the time window
     *
     * @example 5 for auth endpoints, 100 for standard API
     */
    maxRequests: number;

    /**
     * Time window duration in seconds
     *
     * @example 60 for a 1-minute window
     */
    windowSeconds: number;

    /**
     * Optional custom identifier function to determine the rate limit key
     *
     * @param request - The incoming Next.js request
     * @returns A unique identifier string for this client
     *
     * @remarks
     * If not provided, defaults to extracting the client's IP address from headers.
     * Common custom identifiers include: API keys, user IDs, session tokens.
     *
     * @example
     * ```typescript
     * identifier: (req) => req.headers.get('x-api-key') || 'anonymous'
     * ```
     */
    identifier?: (request: NextRequest) => string;
}

/**
 * Rate limiter middleware for API routes using a sliding window algorithm
 *
 * @param request - The incoming Next.js request to rate limit
 * @param config - Rate limit configuration specifying limits and window
 *
 * @returns Promise resolving to rate limit result with:
 * - `limited`: true if the request exceeds the rate limit
 * - `response`: Pre-built 429 Too Many Requests response (if limited)
 * - `remaining`: Number of requests remaining in the current window
 *
 * @remarks
 * This implementation uses an in-memory store suitable for single-server deployments.
 * For multi-server production environments, migrate to Redis or another distributed cache.
 *
 * The function automatically sets standard rate limit headers:
 * - `X-RateLimit-Limit`: Maximum requests allowed
 * - `X-RateLimit-Remaining`: Requests remaining in window
 * - `X-RateLimit-Reset`: ISO timestamp when the limit resets
 * - `Retry-After`: Seconds until the client can retry (when limited)
 *
 * @example Basic usage
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, {
 *     maxRequests: 5,
 *     windowSeconds: 60
 *   });
 *
 *   if (rateLimitResult.limited) {
 *     return rateLimitResult.response; // Returns 429 with retry info
 *   }
 *
 *   // Process request...
 * }
 * ```
 *
 * @example Using presets
 * ```typescript
 * import { rateLimit, RateLimitPresets } from '@/lib/rate-limiter';
 *
 * export async function POST(request: NextRequest) {
 *   const result = await rateLimit(request, RateLimitPresets.AUTH);
 *   if (result.limited) return result.response;
 *   // ...
 * }
 * ```
 *
 * @example Custom identifier
 * ```typescript
 * const result = await rateLimit(request, {
 *   maxRequests: 100,
 *   windowSeconds: 60,
 *   identifier: (req) => req.headers.get('x-api-key') || 'anonymous'
 * });
 * ```
 */
export async function rateLimit(
    request: NextRequest,
    config: RateLimitConfig
): Promise<{
    /** Whether the request has been rate limited */
    limited: boolean;
    /** Pre-built 429 response to return (only present if limited) */
    response?: NextResponse;
    /** Number of requests remaining in the current window */
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
 * Extracts a unique client identifier from the request
 *
 * @param request - The incoming Next.js request
 * @returns A unique identifier string for rate limiting
 *
 * @remarks
 * The function attempts to identify clients in the following priority order:
 * 1. `x-forwarded-for` header (first IP in comma-separated list) - for proxied requests
 * 2. `x-real-ip` header - for reverse proxy setups
 * 3. Fallback: combination of User-Agent + Accept-Language (truncated to 100 chars)
 *
 * The fallback mechanism ensures rate limiting works even when IP headers are unavailable,
 * though it's less accurate for identifying unique clients.
 *
 * @example
 * ```typescript
 * const identifier = getClientIdentifier(request);
 * // Returns: "203.0.113.42" (IP) or "Mozilla/5.0...-en-US,en;q=0.9" (fallback)
 * ```
 *
 * @internal
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
 *
 * @remarks
 * These presets provide sensible defaults for different types of endpoints.
 * You can use them directly or customize them based on your specific needs.
 *
 * @example
 * ```typescript
 * import { rateLimit, RateLimitPresets } from '@/lib/rate-limiter';
 *
 * // Authentication endpoints
 * const authResult = await rateLimit(request, RateLimitPresets.AUTH);
 *
 * // General API endpoints
 * const apiResult = await rateLimit(request, RateLimitPresets.STANDARD);
 *
 * // Custom modification
 * const customResult = await rateLimit(request, {
 *   ...RateLimitPresets.STRICT,
 *   windowSeconds: 120 // Extend window to 2 minutes
 * });
 * ```
 */
export const RateLimitPresets = {
    /**
     * 5 requests per minute - for authentication endpoints
     *
     * @remarks
     * Recommended for: login, signup, password reset, forgot password
     * Provides strong protection against brute force attacks while allowing
     * legitimate users reasonable retry attempts.
     */
    AUTH: {
        maxRequests: 5,
        windowSeconds: 60,
    },

    /**
     * 10 requests per minute - for sensitive operations
     *
     * @remarks
     * Recommended for: financial transactions, data exports, admin actions
     * Balances security with usability for operations that require extra protection.
     */
    STRICT: {
        maxRequests: 10,
        windowSeconds: 60,
    },

    /**
     * 100 requests per minute - for general API usage
     *
     * @remarks
     * Recommended for: standard CRUD operations, searches, data fetching
     * Suitable for most API endpoints in typical applications.
     */
    STANDARD: {
        maxRequests: 100,
        windowSeconds: 60,
    },

    /**
     * 1000 requests per minute - for high-volume endpoints
     *
     * @remarks
     * Recommended for: public data endpoints, health checks, webhooks
     * Allows high throughput while still preventing abuse.
     */
    GENEROUS: {
        maxRequests: 1000,
        windowSeconds: 60,
    },
} as const;
