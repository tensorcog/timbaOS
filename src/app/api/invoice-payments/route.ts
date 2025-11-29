import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole, InvoiceStatus, InvoicePaymentMethod } from '@prisma/client';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';

// POST /api/invoice-payments - Record payment for invoice
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role as UserRole;
        const userLocationIds = session.user.locationIds || [];

        // Only managers and admins can record payments
        if (userRole === UserRole.SALES || userRole === UserRole.WAREHOUSE) {
            return NextResponse.json(
                { error: 'Forbidden - Insufficient permissions' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            invoiceId,
            customerId,
            amount,
            paymentMethod,
            referenceNumber,
            notes,
            paymentDate,
        } = body;

        // Validate required fields
        if (!customerId || !amount || !paymentMethod) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const paymentAmount = new Decimal(amount);

        if (paymentAmount.toNumber() <= 0) {
            return NextResponse.json(
                { error: 'Payment amount must be greater than zero' },
                { status: 400 }
            );
        }

        // If invoice ID provided, validate it
        let invoice = null;
        if (invoiceId) {
            invoice = await prisma.invoice.findUnique({
                where: { id: invoiceId },
                select: {
                    id: true,
                    locationId: true,
                    balanceDue: true,
                    customerId: true,
                    status: true,
                },
            });

            if (!invoice) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }

            if (invoice.customerId !== customerId) {
                return NextResponse.json(
                    { error: 'Invoice does not belong to specified customer' },
                    { status: 400 }
                );
            }

            // Check location access
            if (
                userRole === UserRole.MANAGER &&
                !userLocationIds.includes(invoice.locationId)
            ) {
                return NextResponse.json(
                    { error: 'Forbidden - No access to this location' },
                    { status: 403 }
                );
            }

            // Can't pay cancelled invoices
            if (invoice.status === InvoiceStatus.CANCELLED) {
                return NextResponse.json(
                    { error: 'Cannot record payment for cancelled invoice' },
                    { status: 400 }
                );
            }
        }

        // Calculate applied and unapplied amounts
        let appliedAmount = new Decimal(0);
        let unappliedAmount = paymentAmount;

        if (invoice) {
            const balanceDue = new Decimal(invoice.balanceDue.toString());
            appliedAmount = paymentAmount.lte(balanceDue) ? paymentAmount : balanceDue;
            unappliedAmount = paymentAmount.minus(appliedAmount);
        }

        // Create payment and update invoice in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create payment record
            const payment = await tx.invoicePayment.create({
                data: {
                    id: randomUUID(),
                    invoiceId: invoiceId || null,
                    customerId,
                    amount: paymentAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                    appliedAmount: appliedAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                    unappliedAmount: unappliedAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                    paymentMethod: paymentMethod as InvoicePaymentMethod,
                    referenceNumber: referenceNumber || null,
                    notes: notes || null,
                    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                    recordedById: session.user.id,
                },
                include: {
                    Invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                        },
                    },
                    Customer: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            // Update invoice if payment is applied
            if (invoice && appliedAmount.toNumber() > 0) {
                // Need to fetch current paidAmount from database
                const currentInvoice = await tx.invoice.findUnique({
                    where: { id: invoice.id },
                    select: { paidAmount: true, balanceDue: true }
                });

                if (!currentInvoice) throw new Error('Invoice not found');

                const currentPaidAmount = new Decimal(currentInvoice.paidAmount.toString());
                const newPaidAmount = currentPaidAmount.plus(appliedAmount);
                const newBalanceDue = new Decimal(currentInvoice.balanceDue.toString()).minus(
                    appliedAmount
                );

                // Determine new status
                let newStatus = invoice.status;
                if (newBalanceDue.toNumber() <= 0) {
                    newStatus = InvoiceStatus.PAID;
                } else if (newBalanceDue.toNumber() < Number(currentInvoice.balanceDue)) {
                    newStatus = InvoiceStatus.PARTIALLY_PAID;
                }

                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        paidAmount: newPaidAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                        balanceDue: newBalanceDue.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
                        status: newStatus,
                        paidAt: newStatus === InvoiceStatus.PAID ? new Date() : null,
                        updatedAt: new Date(),
                    },
                });
            }

            return payment;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        logApiError('Failed to record payment:', error);
        return NextResponse.json(
            { error: 'Failed to record payment' },
            { status: 500 }
        );
    }
}

// GET /api/invoice-payments - List payments
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role as UserRole;
        const userLocationIds = session.user.locationIds || [];

        const searchParams = request.nextUrl.searchParams;
        const customerId = searchParams.get('customerId');
        const invoiceId = searchParams.get('invoiceId');

        const filters: any = {};

        if (customerId) {
            filters.customerId = customerId;
        }

        if (invoiceId) {
            filters.invoiceId = invoiceId;
        }

        // Location-based filtering through invoice
        let payments;
        if (userRole === UserRole.MANAGER) {
            payments = await prisma.invoicePayment.findMany({
                where: {
                    ...filters,
                    Invoice: {
                        locationId: { in: userLocationIds },
                    },
                },
                include: {
                    Invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            locationId: true,
                        },
                    },
                    Customer: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    RecordedBy: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    paymentDate: 'desc',
                },
            });
        } else {
            payments = await prisma.invoicePayment.findMany({
                where: filters,
                include: {
                    Invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            locationId: true,
                        },
                    },
                    Customer: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    RecordedBy: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    paymentDate: 'desc',
                },
            });
        }

        return NextResponse.json(payments);
    } catch (error) {
        logApiError('Failed to fetch payments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payments' },
            { status: 500 }
        );
    }
}
