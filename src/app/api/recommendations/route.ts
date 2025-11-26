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
                recommendedProduct: {
                    include: {
                        inventory: {
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
                const totalStock = rec.recommendedProduct.inventory.reduce(
                    (sum, inv) => sum + inv.stockLevel,
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
            .map(rec => ({
                product: {
                    id: rec.recommendedProduct.id,
                    name: rec.recommendedProduct.name,
                    sku: rec.recommendedProduct.sku,
                    price: parseFloat(rec.recommendedProduct.basePrice.toString()),
                },
                strength: rec.strength,
                reason: rec.reason,
            }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Recommendation fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
    }
}
