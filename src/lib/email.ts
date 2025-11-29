import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@yourdomain.com';
const APP_NAME = 'Bills Supplies';

interface SendPasswordResetEmailParams {
    email: string;
    resetLink: string;
    userName?: string;
}

export async function sendPasswordResetEmail({
    email,
    resetLink,
    userName,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
    if (!resend) {
        console.warn('Email service not configured. Reset link:', resetLink);
        // In development, just log the link
        return { success: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `Password Reset - ${APP_NAME}`,
            html: getPasswordResetEmailHTML(resetLink, userName),
            text: getPasswordResetEmailText(resetLink, userName),
        });

        if (error) {
            console.error('Failed to send password reset email:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

function getPasswordResetEmailHTML(resetLink: string, userName?: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${APP_NAME}</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
              
              ${userName ? `<p style="margin: 0 0 16px; color: #666666; font-size: 16px; line-height: 1.5;">Hi ${userName},</p>` : ''}
              
              <p style="margin: 0 0 16px; color: #666666; font-size: 16px; line-height: 1.5;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; color: #666666; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; padding: 12px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all; font-size: 13px; color: #495057; font-family: monospace;">
                ${resetLink}
              </p>
              
              <!-- Security Notice -->
              <div style="margin: 30px 0; padding: 16px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #856404; font-size: 14px; font-weight: 600;">⚠️ Security Notice</p>
                <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                  This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>
              
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getPasswordResetEmailText(resetLink: string, userName?: string): string {
    return `
${APP_NAME} - Password Reset

${userName ? `Hi ${userName},\n\n` : ''}We received a request to reset your password.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

This is an automated message, please do not reply to this email.

© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `.trim();
}

// ===== INVOICE EMAIL FUNCTIONS =====

interface SendInvoiceEmailParams {
    invoiceId: string;
    customerEmail: string;
    pdfBuffer?: Buffer;
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{ success: boolean; error?: string }> {
    const { invoiceId, customerEmail, pdfBuffer } = params;

    if (!resend) {
        console.warn('Email service not configured. Would send invoice to:', customerEmail);
        return { success: true };
    }

    try {
        // Fetch invoice data
        const invoice = await require('./prisma').default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                Customer: true,
            },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }

        const attachments = pdfBuffer
            ? [{
                filename: `Invoice-${invoice.invoiceNumber}.pdf`,
                content: pdfBuffer,
            }]
            : [];

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `Invoice ${invoice.invoiceNumber} from ${APP_NAME}`,
            html: getInvoiceEmailHTML(invoice),
            text: getInvoiceEmailText(invoice),
            attachments,
        });

        if (error) {
            console.error('Failed to send invoice email:', error);
            return { success: false, error: error.message };
        }

        // Log email sent
        await require('./prisma').default.invoiceEmailLog.create({
            data: {
                id: require('crypto').randomUUID(),
                invoiceId,
                emailType: 'INVOICE_DELIVERY',
                recipient: customerEmail,
                subject: `Invoice ${invoice.invoiceNumber} from ${APP_NAME}`,
                status: 'SENT',
            },
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending invoice email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

interface SendPaymentReminderParams {
    invoiceId: string;
    customerEmail: string;
    daysOverdue: number;
}

export async function sendPaymentReminderEmail(params: SendPaymentReminderParams): Promise<{ success: boolean; error?: string }> {
    const { invoiceId, customerEmail, daysOverdue } = params;

    if (!resend) {
        console.warn('Email service not configured. Would send reminder to:', customerEmail);
        return { success: true };
    }

    try {
        const invoice = await require('./prisma').default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                Customer: true,
            },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
            html: getPaymentReminderHTML(invoice, daysOverdue),
            text: getPaymentReminderText(invoice, daysOverdue),
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // Log reminder
        await require('./prisma').default.invoiceEmailLog.create({
            data: {
                id: require('crypto').randomUUID(),
                invoiceId,
                emailType: 'PAYMENT_REMINDER',
                recipient: customerEmail,
                subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
                status: 'SENT',
            },
        });

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

export async function sendPaymentConfirmationEmail(invoiceId: string, customerEmail: string): Promise<{ success: boolean; error?: string }> {
    if (!resend) {
        return { success: true };
    }

    try {
        const invoice = await require('./prisma').default.invoice.findUnique({
            where: { id: invoiceId },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `Payment Received - Invoice ${invoice.invoiceNumber}`,
            html: getPaymentConfirmationHTML(invoice),
            text: getPaymentConfirmationText(invoice),
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Email HTML Templates

function getInvoiceEmailHTML(invoice: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Invoice</title>
</head>
<body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\">
  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px;\">
    <h1 style=\"color: #667eea;\">Invoice from ${APP_NAME}</h1>
    <p>Dear ${invoice.Customer.name},</p>
    <p>Please find attached your invoice <strong>#${invoice.invoiceNumber}</strong>.</p>
    
    <div style=\"background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;\">
      <p style=\"margin: 5px 0;\"><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
      <p style=\"margin: 5px 0;\"><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      <p style=\"margin: 5px 0;\"><strong>Total Amount:</strong> $${invoice.totalAmount}</p>
      <p style=\"margin: 5px 0;\"><strong>Balance Due:</strong> $${invoice.balanceDue}</p>
    </div>
    
    <p>Payment can be made via the following methods:</p>
    <ul>
      <li>Online payment (visit our website)</li>
      <li>Bank transfer</li>
      <li>Check</li>
    </ul>
    
    <p>If you have any questions, please don't hesitate to contact us.</p>
    <p>Thank you for your business!</p>
    <p style=\"margin-top: 30px; color: #999; font-size: 12px;\">© ${new Date().getFullYear()} ${APP_NAME}</p>
  </div>
</body>
</html>
`;
}

function getInvoiceEmailText(invoice: any): string {
    return `
Invoice from ${APP_NAME}

Dear ${invoice.Customer.name},

Please find attached your invoice #${invoice.invoiceNumber}.

Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
Total Amount: $${invoice.totalAmount}
Balance Due: $${invoice.balanceDue}

Payment can be made via online payment, bank transfer, or check.

If you have any questions, please contact us.

Thank you for your business!

© ${new Date().getFullYear()} ${APP_NAME}
    `.trim();
}

function getPaymentReminderHTML(invoice: any, daysOverdue: number): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Payment Reminder</title>
</head>
<body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\">
  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px;\">
    <h1 style=\"color: #dc2626;\">Payment Reminder</h1>
    <p>Dear ${invoice.Customer.name},</p>
    <p>This is a friendly reminder that invoice <strong>#${invoice.invoiceNumber}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
    
    <div style=\"background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;\">
      <p style=\"margin: 5px 0;\"><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
      <p style=\"margin: 5px 0;\"><strong>Original Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      <p style=\"margin: 5px 0; color: #dc2626; font-size: 18px;\"><strong>Amount Due:</strong> $${invoice.balanceDue}</p>
    </div>
    
    <p>Please arrange payment at your earliest convenience. If you have already sent payment, please disregard this notice.</p>
    <p>If you have any questions or concerns about this invoice, please contact us immediately.</p>
    <p>Thank you for your prompt attention to this matter.</p>
    <p style=\"margin-top: 30px; color: #999; font-size: 12px;\">© ${new Date().getFullYear()} ${APP_NAME}</p>
  </div>
</body>
</html>
`;
}

function getPaymentReminderText(invoice: any, daysOverdue: number): string {
    return `
Payment Reminder

Dear ${invoice.Customer.name},

This is a friendly reminder that invoice #${invoice.invoiceNumber} is now ${daysOverdue} days overdue.

Invoice Number: ${invoice.invoiceNumber}
Original Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
Amount Due: $${invoice.balanceDue}

Please arrange payment at your earliest convenience. If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

© ${new Date().getFullYear()} ${APP_NAME}
  ` .trim();
}

function getPaymentConfirmationHTML(invoice: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Payment Received</title>
</head>
<body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\">
  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px;\">
    <h1 style=\"color: #22c55e;\">✓ Payment Received</h1>
    <p>Dear Customer,</p>
    <p>Thank you! We have received your payment for invoice <strong>#${invoice.invoiceNumber}</strong>.</p>
    
    <div style=\"background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;\">
      <p style=\"margin: 5px 0;\"><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
      <p style=\"margin: 5px 0;\"><strong>Amount Paid:</strong> $${invoice.paidAmount}</p>
      <p style=\"margin: 5px 0;\"><strong>Payment Status:</strong> ${invoice.status}</p>
    </div>
    
    <p>We appreciate your business and look forward to serving you again.</p>
    <p style=\"margin-top: 30px; color: #999; font-size: 12px;\">© ${new Date().getFullYear()} ${APP_NAME}</p>
  </div>
</body>
</html>
`;
}

function getPaymentConfirmationText(invoice: any): string {
    return `
Payment Received

Dear Customer,

Thank you! We have received your payment for invoice #${invoice.invoiceNumber}.

Invoice Number: ${invoice.invoiceNumber}
Amount Paid: $${invoice.paidAmount}
Payment Status: ${invoice.status}

We appreciate your business.

© ${new Date().getFullYear()} ${APP_NAME}
    `.trim();
}
