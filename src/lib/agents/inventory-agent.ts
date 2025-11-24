import { BaseAgent, AgentResult } from '../agent-core';
import prisma from '../prisma';

export class InventoryAgent extends BaseAgent {
    constructor() {
        super('StockWatcher', 'INVENTORY_WATCHER');
    }

    async run(): Promise<AgentResult> {
        this.log('Checking inventory levels...');

        try {
            // Find products with low stock (e.g., less than 10)
            const lowStockProducts = await prisma.product.findMany({
                where: {
                    stockLevel: {
                        lt: 10
                    }
                }
            });

            if (lowStockProducts.length === 0) {
                this.log('All stock levels are healthy.');
                return { success: true, message: 'Inventory healthy', data: [] };
            }

            this.log(`Found ${lowStockProducts.length} products with low stock.`);

            // In a real app, this would trigger a PO creation or notification
            // For now, we just return the data

            return {
                success: true,
                message: `Found ${lowStockProducts.length} low stock items`,
                data: lowStockProducts
            };

        } catch (error: any) {
            console.error('Error running InventoryAgent:', error);
            return { success: false, message: error.message };
        }
    }
}
