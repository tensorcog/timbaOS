import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { createQuoteSchema } from '@/lib/validations/quote';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Decimal from 'decimal.js';
import { QuoteStatus, UserRole } from '@prisma/client';
import { checkLocationAccess } from '@/lib/permissions';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    let session;
    try {
        const body = await request.json();

        // Validate input
        const validationResult = createQuoteSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validationResult.error.format() },
                { status: 400 }
            );
        }

        const { customerId, locationId, items, deliveryAddress, notes, validityDays } = validationResult.data;

        // Get location for tax rate
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: { taxRate: true },
        });

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Get customer for tax exempt status
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { taxExempt: true },
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Get authenticated user
        session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const userRole = session.user.role as UserRole;

        // Only sales, managers, and admins can create quotes - warehouse cannot
        if (userRole === UserRole.WAREHOUSE) {
            return NextResponse.json(
                { error: 'Forbidden - Warehouse users cannot create quotes' },
                { status: 403 }
            );
        }

        // Check if user has access to the selected location
        const hasLocationAccess = await checkLocationAccess(userId, locationId);
        if (!hasLocationAccess && userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.LOCATION_ADMIN) {
            return NextResponse.json(
                { error: 'Forbidden - No access to this location' },
                { status: 403 }
            );
        }

        // Get System Configs
        const [defaultTaxRateConfig, deliveryFeeThresholdConfig, deliveryFeeAmountConfig] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { key: 'DEFAULT_TAX_RATE' } }),
            prisma.systemConfig.findUnique({ where: { key: 'DELIVERY_FEE_THRESHOLD' } }),
            prisma.systemConfig.findUnique({ where: { key: 'DELIVERY_FEE_AMOUNT' } }),
        ]);

        const defaultTaxRate = defaultTaxRateConfig?.value ? Number(defaultTaxRateConfig.value) : 0.0825;
        const deliveryFeeThreshold = deliveryFeeThresholdConfig?.value ? Number(deliveryFeeThresholdConfig.value) : 1000;
        const deliveryFeeAmount = deliveryFeeAmountConfig?.value ? Number(deliveryFeeAmountConfig.value) : 100;

        const taxRate = parseFloat(location.taxRate?.toString() || defaultTaxRate.toString());

        // Calculate totals using Decimal for precision
        let subtotal = new Decimal(0);
        let discountAmount = new Decimal(0);

        const processedItems = items.map(item => {
            const unitPrice = new Decimal(item.unitPrice);
            const quantity = item.quantity;
            const discount = new Decimal(item.discount || 0);

            const itemSubtotal = unitPrice.times(quantity).minus(discount);

            subtotal = subtotal.plus(itemSubtotal);
            discountAmount = discountAmount.plus(discount);

            return {
                id: randomUUID(),
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: unitPrice.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                discount: discount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                subtotal: itemSubtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
            };
        });

        // Delivery Fee Logic
        const deliveryFee = deliveryAddress && subtotal.toNumber() < deliveryFeeThreshold
            ? new Decimal(deliveryFeeAmount)
            : new Decimal(0);

        // Tax Logic
        const taxAmount = customer.taxExempt
            ? new Decimal(0)
            : subtotal.times(taxRate);

        const totalAmount = subtotal.plus(deliveryFee).plus(taxAmount);

        // Generate Quote Number using Sequence
        const sequence = await prisma.quoteSequence.create({ data: {} });
        const quoteNumber = `Q-${1000 + sequence.id}`;

        // Calculate valid until date
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + validityDays);

        // Create quote
        const quote = await prisma.quote.create({
            data: {
                id: randomUUID(),
                quoteNumber,
                locationId,
                customerId,
                createdById: userId,
                status: QuoteStatus.PENDING,
                validUntil,
                subtotal: subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                discountAmount: discountAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                taxAmount: taxAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                deliveryFee: deliveryFee.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                notes: notes || null,
                terms: 'Standard terms and conditions apply.',
                updatedAt: new Date(),
                QuoteItem: {
                    create: processedItems,
                },
            },
            include: {
                QuoteItem: {
                    include: {
                        Product: true,
                    },
                },
                Customer: true,
                Location: true,
            },
        });

        // Log activity
        await logActivity({
            entityType: 'Quote',
            entityId: quote.id,
            action: 'CREATE',
            userId: userId,
            changes: {
                quoteNumber: { new: quoteNumber },
                totalAmount: { new: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP) },
                customerId: { new: customerId },
                itemsCount: { new: items.length },
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json(quote);
    } catch (error) {
        console.error('Quote creation error:', error);

        // Check if it's a Prisma foreign key constraint error
        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as any;
            if (prismaError.code === 'P2003') {
                const field = prismaError.meta?.field_name || 'unknown field';
                console.error(`Foreign key constraint violation on: ${field}`);
                console.error(`User ID attempting to create quote: ${session?.user?.id}`);

                return NextResponse.json({
                    error: 'Database constraint error. Please ensure you are logged in with a valid account.',
                    details: `Constraint violated: ${field}`
                }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role as UserRole;
        const userLocationIds = session.user.locationIds || [];

        const searchParams = request.nextUrl.searchParams;
        const statusParam = searchParams.get('status');
        const status = statusParam ? (statusParam as QuoteStatus) : undefined;

        // Build location filter based on role
        const locationFilter = (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN)
            ? {} // Admins see all
            : { locationId: { in: userLocationIds } }; // Others see only their locations

        // Sales users only see their own quotes
        const ownershipFilter = userRole === UserRole.SALES
            ? { createdById: session.user.id }
            : {};

        const quotes = await prisma.quote.findMany({
            where: {
                ...(status ? { status } : {}),
                ...locationFilter,
                ...ownershipFilter,
            },
            include: {
                Customer: true,
                Location: true,
                QuoteItem: {
                    include: {
                        Product: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(quotes);
    } catch (error) {
        console.error('Quote fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }
}
