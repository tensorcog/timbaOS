import { BaseAgent, AgentResult } from '../agent-core';
import prisma from '../prisma';

export class ProductRecommendationAgent extends BaseAgent {
    constructor() {
        super('ProductRecommender', 'PRODUCT_RECOMMENDER');
    }

    async run(): Promise<AgentResult> {
        this.log('Starting product recommendation analysis...');

        try {
            // 1. Fetch all orders with more than 1 item
            const orders = await prisma.order.findMany({
                where: {
                    items: {
                        some: {}
                    }
                },
                include: {
                    items: true
                }
            });

            // Filter for multi-item orders in memory (Prisma doesn't support "count > 1" easily in where)
            const multiItemOrders = orders.filter(o => o.items.length > 1);
            this.log(`Analyzing ${multiItemOrders.length} multi-item orders.`);

            // 2. Build Co-occurrence Matrix
            // Map: ProductId -> Map<CoPurchasedProductId, Count>
            const coOccurrence = new Map<string, Map<string, number>>();
            const productCounts = new Map<string, number>();

            for (const order of multiItemOrders) {
                const items = order.items;

                // Update individual product counts
                for (const item of items) {
                    productCounts.set(item.productId, (productCounts.get(item.productId) || 0) + 1);
                }

                // Update pairs
                for (let i = 0; i < items.length; i++) {
                    for (let j = 0; j < items.length; j++) {
                        if (i === j) continue;

                        const p1 = items[i].productId;
                        const p2 = items[j].productId;

                        if (!coOccurrence.has(p1)) {
                            coOccurrence.set(p1, new Map());
                        }
                        const p1Map = coOccurrence.get(p1)!;
                        p1Map.set(p2, (p1Map.get(p2) || 0) + 1);
                    }
                }
            }

            // 3. Calculate Strength and Upsert Recommendations
            let createdCount = 0;
            const recommendations = [];

            // Clear old recommendations (optional, but keeps it clean)
            await prisma.productRecommendation.deleteMany();

            for (const [productId, coMap] of Array.from(coOccurrence.entries())) {
                const totalOrders = productCounts.get(productId) || 1;

                for (const [recommendedId, count] of Array.from(coMap.entries())) {
                    const strength = count / totalOrders;

                    // Threshold: 10% co-occurrence
                    if (strength > 0.1) {
                        const rec = await prisma.productRecommendation.create({
                            data: {
                                productId,
                                recommendedProductId: recommendedId,
                                strength,
                                reason: `Bought together in ${Math.round(strength * 100)}% of orders`
                            }
                        });
                        recommendations.push(rec);
                        createdCount++;
                    }
                }
            }

            this.log(`Generated ${createdCount} product recommendations.`);

            return {
                success: true,
                message: `Generated ${createdCount} recommendations based on ${multiItemOrders.length} orders.`,
                data: recommendations
            };

        } catch (error: any) {
            console.error('Error running ProductRecommendationAgent:', error);
            return { success: false, message: error.message };
        }
    }
}
