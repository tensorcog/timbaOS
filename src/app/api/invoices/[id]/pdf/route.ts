import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { UserRole } from '@prisma/client';

// GET /api/invoices/[id]/pdf - Download invoice PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;

    // Only managers and admins can download invoice PDFs
    if (userRole === UserRole.SALES || userRole === UserRole.WAREHOUSE) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const invoiceId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('templateId') || undefined;

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      invoiceId,
      templateId,
    });

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceId.substring(0, 8)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logApiError('Failed to generate invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
