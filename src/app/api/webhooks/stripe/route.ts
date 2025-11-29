import { logApiError } from '@/lib/api-logger';
import { NextRequest, NextResponse } from 'next/server';
import { handlePaymentSuccess, handlePaymentFailed, verifyWebhookSignature } from '@/lib/payment-gateways/stripe-service';
import { logger } from '@/lib/logger';

// POST /api/webhooks/stripe - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature, webhookSecret);

    logger.info(`Received Stripe webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as any);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as any);
        break;

      case 'charge.refunded':
        // Handle refund webhook if needed
        logger.info(`Refund processed: ${event.data.object.id}`);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logApiError('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
