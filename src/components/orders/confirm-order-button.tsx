'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface ConfirmOrderButtonProps {
    orderId: string;
    orderNumber: string;
    status: string;
}

export function ConfirmOrderButton({ orderId, orderNumber, status }: ConfirmOrderButtonProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const router = useRouter();

    const handleConfirm = async () => {
        setIsConfirming(true);

        try {
            const response = await fetch(`/api/orders/${orderId}/confirm`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to confirm order');
            }

            toast.success(data.message || 'Order confirmed successfully!');
            router.refresh();
        } catch (error) {
            console.error('Confirm error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to confirm order');
        } finally {
            setIsConfirming(false);
        }
    };

    if (status !== 'PENDING') {
        return null;
    }

    return (
        <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full py-2 px-4 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isConfirming ? 'Confirming...' : 'Confirm & Process Order'}
        </button>
    );
}
