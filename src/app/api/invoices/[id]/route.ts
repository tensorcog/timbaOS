import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole, InvoiceStatus } from '@prisma/client';

interface RouteParams {
    params: {
        id: string;
    };
}

// GET /api/invoices/[id] - Get invoice details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role as UserRole;
        const userLocationIds = session.user.locationIds || [];

        const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            include: {
                Customer: true,
                Location: true,
                InvoiceItem: {
                    include: {
                        Product: true,
                    },
                },
                InvoicePayment: {
                    include: {
                        RecordedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        paymentDate: 'desc',
                    },
                },
                CreatedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                Order: {
                    select: {
                        id: true,
                        orderNumber: true,
                    },
                },
                Quote: {
                    select: {
                        id: true,
                        quoteNumber: true,
                    },
                },
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Check access
        if (
            userRole === UserRole.MANAGER &&
            !userLocationIds.includes(invoice.locationId)
        ) {
            return NextResponse.json(
                { error: 'Forbidden - No access to this invoice' },
                { status: 403 }
            );
        }

        return NextResponse.json(invoice);
    } catch (error) {
        console.error('Failed to fetch invoice:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoice' },
            { status: 500 }
        );
    }
}

// PATCH /api/invoices/[id] - Update draft invoice
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role as UserRole;
        const userLocationIds = session.user.locationIds || [];

        const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            select: { id: true, status: true, locationId: true },
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Can only edit draft invoices
        if (invoice.status !== InvoiceStatus.DRAFT) {
            return NextResponse.json(
                { error: 'Can only edit draft invoices' },
                { status: 400 }
            );
        }

        // Check access
        if (
            userRole === UserRole.MANAGER &&
            !userLocationIds.includes(invoice.locationId)
        ) {
            return NextResponse.json(
                { error: 'Forbidden - No access to this invoice' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { notes, terms } = body;

        const updatedInvoice = await prisma.invoice.update({
            where: { id: params.id },
            data: {
                notes: notes !== undefined ? notes : undefined,
                terms: terms !== undefined ? terms : undefined,
                updatedAt: new Date(),
            },
            include: {
                Customer: true,
                Location: true,
                InvoiceItem: {
                    include: {
                        Product: true,
                    },
                },
            },
        });

        return NextResponse.json(updatedInvoice);
    } catch (error) {
        console.error('Failed to update invoice:', error);
        return NextResponse.json(
            { error: 'Failed to update invoice' },
            { status: 500 }
        );
    }
}

// DELETE /api/invoices/[id] - Delete draft invoice
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role as UserRole;
        const userLocationIds = session.user.locationIds || [];

        // Only admins can delete invoices
        if (
            userRole !== UserRole.SUPER_ADMIN &&
            userRole !== UserRole.LOCATION_ADMIN
        ) {
            return NextResponse.json(
                { error: 'Forbidden - Insufficient permissions' },
                { status: 403 }
            );
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            select: { id: true, status: true, locationId: true, paidAmount: true },
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Can only delete draft invoices with no payments
        if (invoice.status !== InvoiceStatus.DRAFT || Number(invoice.paidAmount) > 0) {
            return NextResponse.json(
                { error: 'Can only delete draft invoices with no payments' },
                { status: 400 }
            );
        }

        await prisma.invoice.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Failed to delete invoice:', error);
        return NextResponse.json(
            { error: 'Failed to delete invoice' },
            { status: 500 }
        );
    }
}
