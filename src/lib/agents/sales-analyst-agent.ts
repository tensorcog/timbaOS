import { BaseAgent, AgentResult } from '../agent-core';
import prisma from '../prisma';

export class SalesAnalystAgent extends BaseAgent {
    constructor() {
        super('SalesAnalyst', 'SALES_ANALYST');
    }

    async run(): Promise<AgentResult> {
        this.log('Starting sales analysis...');

        try {
            // 1. Calculate Average Daily Sales (ADS) for the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const orders = await prisma.order.findMany({
                where: {
                    createdAt: {
                        gte: thirtyDaysAgo
                    },
                    status: 'COMPLETED'
                },
                include: {
                    items: true
                }
            });

            this.log(`Analyzed ${orders.length} orders from the last 30 days.`);

            // Map: LocationId -> ProductId -> TotalQuantity
            const salesMap = new Map<string, Map<string, number>>();

            for (const order of orders) {
                if (!salesMap.has(order.locationId)) {
                    salesMap.set(order.locationId, new Map());
                }
                const locationSales = salesMap.get(order.locationId)!;

                for (const item of order.items) {
                    const currentQty = locationSales.get(item.productId) || 0;
                    locationSales.set(item.productId, currentQty + item.quantity);
                }
            }

            const updates: any[] = [];

            // 2. Update Inventory Settings
            for (const [locationId, productSales] of Array.from(salesMap.entries())) {
                for (const [productId, totalQty] of Array.from(productSales.entries())) {
                    const ads = totalQty / 30;

                    // Logic:
                    // Lead Time = 7 days (assumed)
                    // Safety Stock = 3 days (assumed)
                    // Reorder Point = (ADS * Lead Time) + Safety Stock
                    // Reorder Quantity = ADS * 14 (2 weeks supply)

                    const newReorderPoint = Math.ceil((ads * 7) + (ads * 3));
                    const newReorderQty = Math.ceil(ads * 14);

                    // Update database
                    const inventory = await prisma.locationInventory.findUnique({
                        where: {
                            locationId_productId: {
                                locationId,
                                productId
                            }
                        }
                    });

                    if (inventory) {
                        // Only update if significantly different to avoid noise
                        if (Math.abs(inventory.reorderPoint - newReorderPoint) > 5) {
                            await prisma.locationInventory.update({
                                where: { id: inventory.id },
                                data: {
                                    reorderPoint: newReorderPoint,
                                    reorderQuantity: newReorderQty
                                }
                            });

                            updates.push({
                                locationId,
                                productId,
                                oldPoint: inventory.reorderPoint,
                                newPoint: newReorderPoint
                            });
                        }
                    }
                }
            }

            this.log(`Updated inventory settings for ${updates.length} items.`);

            return {
                success: true,
                message: `Analyzed sales and updated ${updates.length} inventory records.`,
                data: updates
            };

        } catch (error: any) {
            console.error('Error running SalesAnalystAgent:', error);
            return { success: false, message: error.message };
        }
    }
}
