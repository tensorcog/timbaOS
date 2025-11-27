'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface ConvertQuoteButtonProps {
    quoteId: string;
    quoteNumber: string;
    status: string;
    isExpired: boolean;
}

export function ConvertQuoteButton({
    quoteId,
    quoteNumber,
    status,
    isExpired
}: ConvertQuoteButtonProps) {
    const [isConverting, setIsConverting] = useState(false);
    const router = useRouter();

    const handleConvert = async () => {
        setIsConverting(true);

        try {
            const response = await fetch(`/api/quotes/${quoteId}/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to convert quote');
            }

            toast.success(data.message || 'Quote converted to order successfully!');

            // Redirect to the new order page
            router.push(`/dashboard/orders/${data.order.id}`);
            router.refresh();
        } catch (error) {
            console.error('Conversion error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to convert quote to order');
            setIsConverting(false);
        }
    };

    // Don't show button if quote is already converted, rejected, expired, or in draft
    if (status === 'ACCEPTED' || status === 'REJECTED' || status === 'EXPIRED' || status === 'DRAFT') {
        return null;
    }

    if (isExpired && status === 'PENDING') {
        return null;
    }

    return (
        <button
            onClick={handleConvert}
            disabled={isConverting}
            className="w-full py-2 px-4 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isConverting ? 'Converting...' : 'Convert to Order'}
        </button>
    );
}
