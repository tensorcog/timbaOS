import prisma from '../../lib/prisma';
import { sendPaymentReminderEmail } from '../../lib/email';
import { logger } from '../../lib/logger';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';

/**
 * Payment Reminder Service
 * 
 * This service runs daily to:
 * 1. Find overdue invoices
 * 2. Send payment reminders based on days overdue
 * 3. Update invoice status to OVERDUE if needed
 * 4. Record reminder history
 */

export async function processPaymentReminders() {
  logger.info('Starting payment reminder processing...');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find invoices that are overdue and not fully paid
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: {
          lt: today,
        },
        status: {
          in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'],
        },
        balanceDue: {
          gt: 0,
        },
        deletedAt: null,
      },
      include: {
        Customer: true,
        InvoiceReminder: {
          orderBy: {
            sentAt: 'desc',
          },
          take: 1,
        },
      },
    });

    logger.info(`Found ${overdueInvoices.length} overdue invoices`);

    let remindersProcessed = 0;
    let remindersSkipped = 0;

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine if we should send a reminder
      const shouldSendReminder = shouldSendReminderForInvoice(invoice, daysOverdue);

      if (!shouldSendReminder.send) {
        remindersSkipped++;
        continue;
      }

      try {
        // Send reminder email
        const emailResult = await sendPaymentReminderEmail({
          invoiceId: invoice.id,
          customerEmail: invoice.Customer.email,
          daysOverdue,
        });

        if (emailResult.success) {
          // Record reminder
          await prisma.invoiceReminder.create({
            data: {
              id: randomUUID(),
              invoiceId: invoice.id,
              reminderType: shouldSendReminder.type,
              daysOverdue,
              emailSent: true,
              emailStatus: 'Sent successfully',
            },
          });

          // Update invoice status to OVERDUE if not already
          if (invoice.status !== 'OVERDUE') {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'OVERDUE' },
            });
          }

          remindersProcessed++;
          logger.info(`Sent ${shouldSendReminder.type} reminder for invoice ${invoice.invoiceNumber}`);
        } else {
          logger.error(`Failed to send reminder for invoice ${invoice.invoiceNumber}: ${emailResult.error}`);
          
          // Still record the attempt
          await prisma.invoiceReminder.create({
            data: {
              id: randomUUID(),
              invoiceId: invoice.id,
              reminderType: shouldSendReminder.type,
              daysOverdue,
              emailSent: false,
              emailStatus: `Failed: ${emailResult.error}`,
            },
          });
        }
      } catch (error) {
        logger.error(`Error processing reminder for invoice ${invoice.invoiceNumber}:`, error);
      }
    }

    logger.info(`Payment reminder processing complete. Processed: ${remindersProcessed}, Skipped: ${remindersSkipped}`);

    return {
      success: true,
      overdueCount: overdueInvoices.length,
      remindersSent: remindersProcessed,
      remindersSkipped,
    };
  } catch (error) {
    logger.error('Error in payment reminder processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Determine if a reminder should be sent for an invoice
 */
function shouldSendReminderForInvoice(invoice: any, daysOverdue: number): { send: boolean; type?: any } {
  const lastReminder = invoice.InvoiceReminder[0];
  
  // No reminder sent yet - send first reminder at 7 days overdue
  if (!lastReminder && daysOverdue >= 7) {
    return { send: true, type: 'FIRST_REMINDER' };
  }

  // If last reminder was sent, check if we should send next one
  if (lastReminder) {
    const daysSinceLastReminder = Math.floor(
      (new Date().getTime() - new Date(lastReminder.sentAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Don't send more than one reminder per week
    if (daysSinceLastReminder < 7) {
      return { send: false };
    }

    // Send second reminder at 14 days overdue
    if (lastReminder.reminderType === 'FIRST_REMINDER' && daysOverdue >= 14) {
      return { send: true, type: 'SECOND_REMINDER' };
    }

    // Send final notice at 30 days overdue
    if (lastReminder.reminderType === 'SECOND_REMINDER' && daysOverdue >= 30) {
      return { send: true, type: 'FINAL_NOTICE' };
    }

    // After  final notice, send courtesy reminders every 30 days
    if (lastReminder.reminderType === 'FINAL_NOTICE' && daysSinceLastReminder >= 30) {
      return { send: true, type: 'COURTESY_REMINDER' };
    }
  }

  return { send: false };
}

/**
 * Process recurring invoices that are due for billing
 */
export async function processRecurringInvoices() {
  logger.info('Starting recurring invoice processing...');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find recurring invoices due for billing
    const dueRecurringInvoices = await prisma.recurringInvoice.findMany({
      where: {
        isActive: true,
        nextBillingDate: {
          lte: today,
        },
      },
      include: {
        Customer: true,
        Location: true,
      },
    });

    logger.info(`Found ${dueRecurringInvoices.length} recurring invoices due for billing`);

    let invoicesCreated = 0;

    for (const recurringInvoice of dueRecurringInvoices) {
      try {
        // Parse template data
        const templateData = recurringInvoice.templateData as any;

        // Generate invoice number
        const sequence = await prisma.invoiceSequence.create({ data: {} });
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const seqNum = String(sequence.id).padStart(4, '0');
        const invoiceNumber = `INV-${year}${month}-${seqNum}`;

        // Calculate due date based on payment terms
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (templateData.paymentTermDays || 30));

        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            id: randomUUID(),
            invoiceNumber,
            customerId: recurringInvoice.customerId,
            locationId: recurringInvoice.locationId,
            recurringInvoiceId: recurringInvoice.id,
            invoiceDate: new Date(),
            dueDate,
            status: 'SENT',
            subtotal: new Decimal(templateData.subtotal),
            taxAmount: new Decimal(templateData.taxAmount),
            discountAmount: new Decimal(templateData.discountAmount || 0),
            deliveryFee: new Decimal(templateData.deliveryFee || 0),
            totalAmount: new Decimal(templateData.totalAmount),
            paidAmount: new Decimal(0),
            balanceDue: new Decimal(templateData.totalAmount),
            notes: templateData.notes || null,
            terms: templateData.terms || null,
            paymentTermDays: templateData.paymentTermDays || 30,
            createdById: recurringInvoice.createdById,
            InvoiceItem: {
              create: (templateData.items || []).map((item: any) => ({
                id: randomUUID(),
                productId: item.productId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: new Decimal(item.unitPrice),
                discount: new Decimal(item.discount || 0),
                subtotal: new Decimal(item.subtotal),
              })),
            },
          },
        });

        // Calculate next billing date
        const nextBillingDate = calculateNextBillingDate(
          recurringInvoice.nextBillingDate,
          recurringInvoice.frequency
        );

        // Update recurring invoice
        await prisma.recurringInvoice.update({
          where: { id: recurringInvoice.id },
          data: { nextBillingDate },
        });

        // TODO: Send invoice email (integrate with email service)
        // await sendInvoiceEmail({ invoiceId: invoice.id, customerEmail: recurringInvoice.Customer.email });

        invoicesCreated++;
        logger.info(`Created recurring invoice ${invoiceNumber} for customer ${recurringInvoice.Customer.name}`);
      } catch (error) {
        logger.error(`Error creating recurring invoice for ${recurringInvoice.id}:`, error);
      }
    }

    logger.info(`Recurring invoice processing complete. Created: ${invoicesCreated} invoices`);

    return {
      success: true,
      dueCount: dueRecurringInvoices.length,
      invoicesCreated,
    };
  } catch (error) {
    logger.error('Error in recurring invoice processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function calculateNextBillingDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'ANNUALLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}
