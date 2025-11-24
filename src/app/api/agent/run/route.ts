import { NextResponse } from 'next/server';
import { InventoryAgent } from '@/lib/agents/inventory-agent';

export async function POST() {
    const agent = new InventoryAgent();
    const result = await agent.run();

    return NextResponse.json(result);
}
