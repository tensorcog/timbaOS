import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { sendInvoiceEmail } from '@/lib/email';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';

// POST /api/invoices/[id]/send - Send invoice via email with PDF attachment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;

    // Only managers and admins can send invoices
    if (userRole === UserRole.SALES || userRole === UserRole.WAREHOUSE) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const invoiceId = params.id;
    const body = await request.json();
    const { customerEmail } = body;

    // Get invoice details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        Customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Use provided email or customer's email
    const recipientEmail = customerEmail || invoice.Customer.email;

    if (! recipientEmail) {
      return NextResponse.json(
        { error: 'No email address provided' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      invoiceId,
    });

    // Send email with PDF attachment
    const emailResult = await sendInvoiceEmail({
      invoiceId,
      customerEmail: recipientEmail,
      pdfBuffer,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update invoice status to SENT if it was DRAFT
    if (invoice.status === 'DRAFT') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${recipientEmail}`,
    });
  } catch (error) {
    logApiError('Failed to send invoice email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
