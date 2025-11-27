'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface SendQuoteButtonProps {
    quoteId: string;
    quoteNumber: string;
    status: string;
}

export function SendQuoteButton({ quoteId, quoteNumber, status }: SendQuoteButtonProps) {
    const [isSending, setIsSending] = useState(false);
    const router = useRouter();

    const handleSend = async () => {
        setIsSending(true);

        try {
            const response = await fetch(`/api/quotes/${quoteId}/send`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send quote');
            }

            toast.success(data.message || 'Quote sent successfully!');

            // Refresh the page to show updated status
            router.refresh();
        } catch (error) {
            console.error('Send error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to send quote');
        } finally {
            setIsSending(false);
        }
    };

    // Don't show button if quote is already sent, accepted, rejected, or expired
    if (status === 'SENT' || status === 'ACCEPTED' || status === 'REJECTED' || status === 'EXPIRED') {
        return null;
    }

    return (
        <button
            onClick={handleSend}
            disabled={isSending}
            className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isSending ? 'Sending...' : 'Send Quote'}
        </button>
    );
}
