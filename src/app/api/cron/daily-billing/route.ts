import { NextRequest, NextResponse } from 'next/server';
import { processPaymentReminders, processRecurringInvoices } from '@/lib/scheduled/billing-jobs';
import { logApiError } from '@/lib/api-logger';

// POST /api/cron/daily-billing - Run daily billing jobs
// This endpoint should be called by a cron service (e.g., Vercel Cron, external cron)
// Protect it with a secret key for security
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secure-cron-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run both jobs
    const [remindersResult, recurringResult] = await Promise.all([
      processPaymentReminders(),
      processRecurringInvoices(),
    ]);

    return NextResponse.json({
      success: true,
      paymentReminders: remindersResult,
      recurringInvoices: recurringResult,
    });
  } catch (error) {
    logApiError('Daily billing cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing (remove in production)
export async function GET(request: NextRequest) {
  return POST(request);
}
