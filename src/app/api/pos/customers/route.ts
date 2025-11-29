import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    try {
        const customers = await prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                taxExempt: true,
            },
            take: 10,
        });

        return NextResponse.json(customers);
    } catch (error) {
        logApiError('Customer search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const customer = await prisma.customer.create({
            data: {
                id: randomUUID(),
                name: body.name,
                email: body.email,
                phone: body.phone || null,
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
        logApiError('Customer creation error:', error);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }
}
