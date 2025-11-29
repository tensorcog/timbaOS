import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const productIdsParam = searchParams.get('productIds');

        if (!productIdsParam) {
            return NextResponse.json({ error: 'productIds required' }, { status: 400 });
        }

        const productIds = productIdsParam.split(',');

        // Get recommendations for all products in cart
        const recommendations = await prisma.productRecommendation.findMany({
            where: {
                productId: {
                    in: productIds,
                },
            },
            include: {
                Product_ProductRecommendation_recommendedProductIdToProduct: {
                    include: {
                        LocationInventory: {
                            select: {
                                stockLevel: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                strength: 'desc',
            },
            take: 10,
        });

        // Filter out products already in cart and out of stock
        const filteredRecommendations = recommendations
            .filter(rec => !productIds.includes(rec.recommendedProductId))
            .filter(rec => {
                const product = rec.Product_ProductRecommendation_recommendedProductIdToProduct;
                const totalStock = product.LocationInventory.reduce(
                    (sum: number, inv: { stockLevel: number }) => sum + inv.stockLevel,
                    0
                );
                return totalStock > 0;
            });

        // Group by recommended product and take highest strength
        const uniqueRecommendations = new Map();
        filteredRecommendations.forEach(rec => {
            if (!uniqueRecommendations.has(rec.recommendedProductId) ||
                uniqueRecommendations.get(rec.recommendedProductId).strength < rec.strength) {
                uniqueRecommendations.set(rec.recommendedProductId, rec);
            }
        });

        const result = Array.from(uniqueRecommendations.values())
            .slice(0, 5)
            .map(rec => {
                const product = rec.Product_ProductRecommendation_recommendedProductIdToProduct;
                return {
                    product: {
                        id: product.id,
                        name: product.name,
                        sku: product.sku,
                        price: parseFloat(product.basePrice.toString()),
                    },
                    strength: rec.strength,
                    reason: rec.reason,
                };
            });

        return NextResponse.json(result);
    } catch (error) {
        logApiError('Recommendation fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
    }
}
