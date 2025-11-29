import NodeCache = require('node-cache');

// Cache for product recommendations
// TTL: 5 minutes (300 seconds)
// checkperiod: automatically delete expired keys every 60 seconds
const recommendationsCache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false, // Don't clone objects for better performance
});

export interface CachedRecommendation {
    product: {
        id: string;
        name: string;
        sku: string;
        price: string;
    };
    strength: number;
    reason: string;
}

/**
 * Generate cache key from location and product IDs
 * Product IDs are sorted to ensure consistent cache hits regardless of order
 */
export function getCacheKey(locationId: string, productIds: string[]): string {
    const sortedIds = [...productIds].sort().join(',');
    return `recs:${locationId}:${sortedIds}`;
}

/**
 * Get cached recommendations
 */
export function getCachedRecommendations(
    locationId: string,
    productIds: string[]
): CachedRecommendation[] | undefined {
    const key = getCacheKey(locationId, productIds);
    return recommendationsCache.get<CachedRecommendation[]>(key);
}

/**
 * Set cached recommendations
 */
export function setCachedRecommendations(
    locationId: string,
    productIds: string[],
    recommendations: CachedRecommendation[]
): void {
    const key = getCacheKey(locationId, productIds);
    recommendationsCache.set(key, recommendations);
}

/**
 * Clear all cached recommendations
 * Useful for invalidation when recommendations are updated
 */
export function clearRecommendationsCache(): void {
    recommendationsCache.flushAll();
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats() {
    return recommendationsCache.getStats();
}
