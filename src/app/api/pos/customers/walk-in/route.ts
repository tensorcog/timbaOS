import { logApiError } from '@/lib/api-logger';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST() {
    try {
        const WALKIN_EMAIL = 'walk-in@pos.local';

        // Try to find existing walk-in customer
        let customer = await prisma.customer.findFirst({
            where: { email: WALKIN_EMAIL },
            select: {
                id: true,
                name: true,
                email: true,
                taxExempt: true,
            },
        });

        // If not found, create one
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    id: randomUUID(),
                    name: 'Walk-in Customer',
                    email: WALKIN_EMAIL,
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
        }

        return NextResponse.json(customer);
    } catch (error) {
        logApiError('Walk-in customer creation error:', error);
        return NextResponse.json({ error: 'Failed to get walk-in customer' }, { status: 500 });
    }
}
