import { NextResponse } from 'next/server';
import { InventoryAgent } from '@/lib/agents/inventory-agent';
import { SalesAnalystAgent } from '@/lib/agents/sales-analyst-agent';
import { ProductRecommendationAgent } from '@/lib/agents/product-recommendation-agent';
import { BaseAgent } from '@/lib/agent-core';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { agentType, locationId } = body;

        let agent: BaseAgent;

        switch (agentType) {
            case 'INVENTORY_WATCHER':
                agent = new InventoryAgent(locationId);
                break;
            case 'SALES_ANALYST':
                agent = new SalesAnalystAgent();
                break;
            case 'PRODUCT_RECOMMENDER':
                agent = new ProductRecommendationAgent();
                break;
            default:
                // Default to InventoryAgent for backward compatibility if no type specified
                if (!agentType) {
                    agent = new InventoryAgent(locationId);
                } else {
                    return NextResponse.json(
                        { success: false, message: `Unknown agent type: ${agentType}` },
                        { status: 400 }
                    );
                }
        }

        const result = await agent.run();

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error running agent:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to run agent' },
            { status: 500 }
        );
    }
}
