'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface CancelOrderButtonProps {
    orderId: string;
    orderNumber: string;
    status: string;
}

export function CancelOrderButton({ orderId, orderNumber, status }: CancelOrderButtonProps) {
    const [isCancelling, setIsCancelling] = useState(false);
    const router = useRouter();

    const handleCancel = async () => {
        if (!confirm(`Are you sure you want to cancel order ${orderNumber}? This action cannot be undone.`)) {
            return;
        }

        setIsCancelling(true);

        try {
            const response = await fetch(`/api/orders/${orderId}/cancel`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to cancel order');
            }

            toast.success(data.message || 'Order cancelled successfully!');
            router.refresh();
        } catch (error) {
            console.error('Cancel error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to cancel order');
        } finally {
            setIsCancelling(false);
        }
    };

    if (status === 'COMPLETED' || status === 'CANCELLED') {
        return null;
    }

    return (
        <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full py-2 px-4 rounded-lg border border-red-600 text-red-600 font-medium hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isCancelling ? 'Cancelling...' : 'Cancel Order'}
        </button>
    );
}
