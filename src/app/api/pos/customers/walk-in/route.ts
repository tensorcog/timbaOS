import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST() {
    try {
        const customer = await prisma.customer.create({
            data: {
                id: randomUUID(),
                name: `Walk-in ${Date.now()}`,
                email: `walkin${Date.now()}@pos.local`,
                customerType: 'RETAIL',
                updatedAt: new Date(),
            },
            select: {
                id: true,
                name: true,
                email: true,
                taxExempt: true,
            },
        });

        return NextResponse.json(customer);
    } catch (error) {
        console.error('Walk-in customer creation error:', error);
        return NextResponse.json({ error: 'Failed to create walk-in customer' }, { status: 500 });
    }
}
