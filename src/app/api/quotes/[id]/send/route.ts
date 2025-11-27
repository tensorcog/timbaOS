import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/audit-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const quoteId = params.id;

        // Fetch the quote
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: {
                Customer: true,
            },
        });

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Validate quote can be sent
        if (quote.status === 'ACCEPTED' || quote.status === 'REJECTED' || quote.status === 'EXPIRED') {
            return NextResponse.json(
                { error: `Cannot send quote with status: ${quote.status}` },
                { status: 400 }
            );
        }

        if (quote.status === 'SENT') {
            return NextResponse.json(
                { error: 'Quote has already been sent' },
                { status: 400 }
            );
        }

        // Update quote status to SENT
        const updatedQuote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: 'SENT',
                sentAt: new Date(),
            },
            include: {
                Customer: true,
                QuoteItem: {
                    include: {
                        Product: true,
                    },
                },
            },
        });

        // Log the activity
        await logActivity({
            entityType: 'Quote',
            entityId: quoteId,
            action: 'UPDATE',
            userId: session.user.id,
            changes: {
                status: { old: quote.status, new: 'SENT' },
                sentAt: { new: updatedQuote.sentAt },
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
            success: true,
            quote: updatedQuote,
            message: `Quote ${quote.quoteNumber} sent to ${quote.Customer.name}`,
        });

    } catch (error) {
        console.error('Send quote error:', error);
        return NextResponse.json(
            { error: 'Failed to send quote' },
            { status: 500 }
        );
    }
}
