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

        console.log('Password reset email sent:', data);
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
