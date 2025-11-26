import { NextResponse } from 'next/server';
import { InventoryAgent } from '@/lib/agents/inventory-agent';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { locationId } = body;

        const agent = new InventoryAgent(locationId);
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
