import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

/**
 * Recommendation Engine
 * Analyzes order history to find frequently bought together products
 */

interface ProductPair {
    productId: string;
    recommendedProductId: string;
    count: number;
}

export async function analyzeRecommendations() {
    console.log('Starting recommendation analysis...');

    // Get all completed orders with items
    const orders = await prisma.order.findMany({
        where: {
            status: 'COMPLETED',
        },
        include: {
            OrderItem: {
                select: {
                    productId: true,
                },
            },
        },
    });

    console.log(`Analyzing ${orders.length} orders...`);

    // Count product pairs (frequently bought together)
    const pairCounts = new Map<string, ProductPair>();

    orders.forEach(order => {
        const productIds = order.OrderItem.map(item => item.productId);

        // For each pair of products in the order
        for (let i = 0; i < productIds.length; i++) {
            for (let j = i + 1; j < productIds.length; j++) {
                const product1 = productIds[i];
                const product2 = productIds[j];

                // Create bidirectional recommendations
                const key1 = `${product1}-${product2}`;
                const key2 = `${product2}-${product1}`;

                if (!pairCounts.has(key1)) {
                    pairCounts.set(key1, {
                        productId: product1,
                        recommendedProductId: product2,
                        count: 0,
                    });
                }
                if (!pairCounts.has(key2)) {
                    pairCounts.set(key2, {
                        productId: product2,
                        recommendedProductId: product1,
                        count: 0,
                    });
                }

                pairCounts.get(key1)!.count++;
                pairCounts.get(key2)!.count++;
            }
        }
    });

    console.log(`Found ${pairCounts.size} product pairs`);

    // Filter pairs with at least 3 occurrences
    const significantPairs = Array.from(pairCounts.values())
        .filter(pair => pair.count >= 3);

    console.log(`${significantPairs.length} significant pairs (3+ occurrences)`);

    // Calculate strength scores (0-1 based on frequency)
    const maxCount = Math.max(...significantPairs.map(p => p.count));
    const recommendations = significantPairs.map(pair => ({
        id: randomUUID(),
        productId: pair.productId,
        recommendedProductId: pair.recommendedProductId,
        strength: Math.min(pair.count / maxCount, 1.0),
        reason: 'frequently_bought_together',
        updatedAt: new Date(),
    }));

    // Clear existing recommendations
    await prisma.productRecommendation.deleteMany({});

    // Insert new recommendations
    if (recommendations.length > 0) {
        await prisma.productRecommendation.createMany({
            data: recommendations,
            skipDuplicates: true,
        });
    }

    console.log(`Created ${recommendations.length} recommendations`);

    return {
        ordersAnalyzed: orders.length,
        pairsFound: pairCounts.size,
        recommendationsCreated: recommendations.length,
    };
}

// Seed some initial recommendations for demo purposes
export async function seedDemoRecommendations() {
    const products = await prisma.product.findMany({
        select: { id: true, name: true, category: true },
    });

    const demoRecommendations: Array<{
        id: string;
        productId: string;
        recommendedProductId: string;
        strength: number;
        reason: string;
        updatedAt: Date;
    }> = [];

    // Find lumber and screws/nails
    const lumber = products.filter(p => p.category.toLowerCase().includes('lumber'));
    const fasteners = products.filter(p =>
        p.name.toLowerCase().includes('screw') ||
        p.name.toLowerCase().includes('nail')
    );

    // Lumber → Fasteners
    lumber.forEach(lumberProduct => {
        fasteners.slice(0, 2).forEach(fastener => {
            demoRecommendations.push({
                id: randomUUID(),
                productId: lumberProduct.id,
                recommendedProductId: fastener.id,
                strength: 0.8,
                reason: 'project_bundle',
                updatedAt: new Date(),
            });
        });
    });

    if (demoRecommendations.length > 0) {
        await prisma.productRecommendation.createMany({
            data: demoRecommendations,
            skipDuplicates: true,
        });
        console.log(`Seeded ${demoRecommendations.length} demo recommendations`);
    }

    return demoRecommendations.length;
}
