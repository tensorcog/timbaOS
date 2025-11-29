import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, getLocationFilter } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';
import {
    getCachedRecommendations,
    setCachedRecommendations,
} from '@/lib/recommendations-cache';

const MAX_PRODUCT_IDS = 50;

export async function GET(request: NextRequest) {
    // Require authentication with SALES role or higher
    const { error, session } = await requireAuth(request, {
        roles: [UserRole.SALES, UserRole.MANAGER, UserRole.LOCATION_ADMIN, UserRole.SUPER_ADMIN],
    });

    if (error) {
        return error;
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const productIdsParam = searchParams.get('productIds');
        const locationId = searchParams.get('locationId');

        // Validate required parameters
        if (!productIdsParam) {
            return NextResponse.json({ error: 'productIds required' }, { status: 400 });
        }

        if (!locationId) {
            return NextResponse.json({ error: 'locationId required' }, { status: 400 });
        }

        // Validate location access
        const locationFilter = getLocationFilter(session!);
        if (locationFilter.locationId && !locationFilter.locationId.in.includes(locationId)) {
            return NextResponse.json(
                { error: 'Forbidden - No access to this location' },
                { status: 403 }
            );
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(locationId)) {
            return NextResponse.json({ error: 'Invalid locationId format' }, { status: 400 });
        }

        // Parse and validate product IDs
        const productIds = productIdsParam
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id.length > 0);

        if (productIds.length === 0) {
            return NextResponse.json({ error: 'At least one productId required' }, { status: 400 });
        }

        if (productIds.some(id => !uuidRegex.test(id))) {
            return NextResponse.json({ error: 'Invalid productId format' }, { status: 400 });
        }

        if (productIds.length > MAX_PRODUCT_IDS) {
            return NextResponse.json(
                { error: `Maximum ${MAX_PRODUCT_IDS} productIds allowed` },
                { status: 400 }
            );
        }

        // Check cache first
        const cached = getCachedRecommendations(locationId, productIds);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Optimized Query: Fetch recommendations with inventory check in one go
        // We use 'distinct' to get unique recommended products with the highest strength
        // We fetch more than 5 items (e.g. 20) to allow for filtering out-of-stock items
        const rawRecommendations = await prisma.productRecommendation.findMany({
            where: {
                productId: {
                    in: productIds,
                },
                // Exclude products already in the input list (e.g. cart)
                recommendedProductId: {
                    notIn: productIds
                }
            },
            include: {
                recommendedProduct: {
                    include: {
                        // Only fetch inventory for the specific location
                        LocationInventory: {
                            where: {
                                locationId: locationId,
                                stockLevel: { gt: 0 }
                            }
                        }
                    }
                }
            },
            orderBy: {
                strength: 'desc',
            },
            distinct: ['recommendedProductId'],
            take: 20, // Fetch extra candidates to account for out-of-stock items
        });

        // Filter and map results
        const result = rawRecommendations
            .filter(rec => rec.recommendedProduct.LocationInventory.length > 0) // Must have stock
            .slice(0, 5) // Take top 5
            .map((rec) => {
                const product = rec.recommendedProduct;
                return {
                    product: {
                        id: product.id,
                        name: product.name,
                        sku: product.sku,
                        // Keep price as string to preserve Decimal precision
                        price: product.basePrice.toString(),
                    },
                    strength: rec.strength,
                    reason: rec.reason,
                };
            });

        // Cache the results
        setCachedRecommendations(locationId, productIds, result);

        return NextResponse.json(result);
    } catch (error) {
        logApiError('Recommendation fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
    }
}
