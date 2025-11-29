'use client';

import { Mail } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface SendInvoiceEmailButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  customerEmail: string;
}

export function SendInvoiceEmailButton({ invoiceId, invoiceNumber, customerEmail }: SendInvoiceEmailButtonProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success(`Invoice sent to ${customerEmail}`);
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <button
      onClick={handleSendEmail}
      disabled={isSending}
      className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-purple-700 disabled:opacity-50"
    >
      <Mail className="h-4 w-4 mr-2" />
      {isSending ? 'Sending...' : 'Send Email'}
    </button>
  );
}
