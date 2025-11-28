import { BaseAgent, AgentResult } from '../agent-core';
import prisma from '../prisma';

export class InventoryAgent extends BaseAgent {
    private locationId?: string;

    constructor(locationId?: string) {
        super('StockWatcher', 'INVENTORY_WATCHER');
        this.locationId = locationId;
    }

    async run(): Promise<AgentResult> {
        this.log(`Checking inventory levels${this.locationId ? ' for location' : ' across all locations'}...`);

        try {
            // Find location inventory with low stock (below reorder point)
            const lowStockItems = await prisma.locationInventory.findMany({
                where: {
                    ...(this.locationId && { locationId: this.locationId }),
                    stockLevel: {
                        lt: prisma.locationInventory.fields.reorderPoint
                    }
                },
                include: {
                    Product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            category: true,
                        }
                    },
                    Location: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        }
                    }
                },
                orderBy: {
                    stockLevel: 'asc'
                }
            });

            if (lowStockItems.length === 0) {
                this.log('All stock levels are healthy.');
                return {
                    success: true,
                    message: 'Inventory healthy',
                    data: []
                };
            }

            this.log(`Found ${lowStockItems.length} items with low stock.`);

            // In a real app, this would trigger transfer requests or PO creation
            // For now, we just return the data

            return {
                success: true,
                message: `Found ${lowStockItems.length} low stock items`,
                data: lowStockItems.map(item => ({
                    location: item.Location.name,
                    locationCode: item.Location.code,
                    product: item.Product.name,
                    sku: item.Product.sku,
                    stockLevel: item.stockLevel,
                    reorderPoint: item.reorderPoint,
                    needsRestock: item.reorderPoint - item.stockLevel,
                }))
            };

        } catch (error: any) {
            console.error('Error running InventoryAgent:', error);
            return { success: false, message: error.message };
        }
    }
}
