import Stripe from 'stripe';
import prisma from '../prisma';
import Decimal from 'decimal.js';
import { logger } from '../logger';

// Initialize Stripe with API key
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

export interface CreatePaymentIntentParams {
  invoiceId: string;
  amount: number; // in cents
  customerId: string;
  description?: string;
}

export interface ProcessRefundParams {
  paymentTransactionId: string;
  amount: number; // in cents
  reason?: string;
}

/**
 * Create a Stripe Payment Intent for an invoice
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  const { invoiceId, amount, customerId, description } = params;

  try {
    // Get invoice details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { Customer: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe expects amount in cents
      currency: 'usd',
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
      },
      description: description || `Payment for Invoice ${invoice.invoiceNumber}`,
      receipt_email: invoice.Customer.email,
    });

    // Update invoice with payment intent ID
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    logger.info(`Created Stripe Payment Intent: ${paymentIntent.id} for invoice ${invoice.invoiceNumber}`);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    logger.error('Failed to create Stripe payment intent:', error);
    throw error;
  }
}

/**
 * Process a refund via Stripe
 */
export async function processRefund(params: ProcessRefundParams) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const { paymentTransactionId, amount, reason } = params;

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentTransactionId,
      amount: Math.round(amount),
      reason: reason as any || 'requested_by_customer',
    });

    logger.info(`Processed Stripe refund: ${refund.id} for payment ${paymentTransactionId}`);

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100, // Convert back to dollars
    };
  } catch (error) {
    logger.error('Failed to process Stripe refund:', error);
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    throw new Error('Invalid signature');
  }
}

/**
 * Handle successful payment from webhook
 */
export async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.invoiceId;

  if (! invoiceId) {
    logger.warn('Payment intent missing invoiceId in metadata');
    return;
  }

  try {
    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      logger.error(`Invoice ${invoiceId} not found for payment ${paymentIntent.id}`);
      return;
    }

    const amountReceived = new Decimal(paymentIntent.amount_received).dividedBy(100); // Convert from cents
    const stripeFee = paymentIntent.charges.data[0]?.balance_transaction
      ? new Decimal((await stripe.balanceTransactions.retrieve(
          paymentIntent.charges.data[0].balance_transaction as string
        )).fee).dividedBy(100)
      : new Decimal(0);

    // Create payment record
    await prisma.invoicePayment.create({
      data: {
        id: require('crypto').randomUUID(),
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: amountReceived,
        appliedAmount: amountReceived,
        unappliedAmount: new Decimal(0),
        paymentMethod: 'CREDIT_CARD',
        paymentDate: new Date(),
        gatewayType: 'STRIPE',
        gatewayTransactionId: paymentIntent.id,
        gatewayFee: stripeFee,
        gatewayMetadata: paymentIntent as any,
        recordedById: invoice.createdById, // Use invoice creator as recorder
        notes: `Stripe payment - ${paymentIntent.id}`,
      },
    });

    // Update invoice
    const newPaidAmount = new Decimal(invoice.paidAmount).plus(amountReceived);
    const newBalanceDue = new Decimal(invoice.totalAmount).minus(newPaidAmount);

    let newStatus = invoice.status;
    let paidAt = invoice.paidAt;

    if (newBalanceDue.lessThanOrEqualTo(0)) {
      newStatus = 'PAID';
      paidAt = new Date();
    } else if (newPaidAmount.greaterThan(0)) {
      newStatus = 'PARTIALLY_PAID';
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus,
        paidAt,
      },
    });

    logger.info(`Recorded payment for invoice ${invoice.invoiceNumber}: $${amountReceived.toFixed(2)}`);
  } catch (error) {
    logger.error('Failed to handle payment success:', error);
    throw error;
  }
}

/**
 * Handle failed payment from webhook
 */
export async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.invoiceId;

  if (!invoiceId) {
    return;
  }

  logger.warn(`Payment failed for invoice ${invoiceId}: ${paymentIntent.last_payment_error?.message}`);

  // Could send notification email here
  // Or update invoice with failed payment attempt log
}
