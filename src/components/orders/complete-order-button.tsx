'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

interface CompleteOrderButtonProps {
    orderId: string;
    orderNumber: string;
    status: string;
}

export function CompleteOrderButton({ orderId, orderNumber, status }: CompleteOrderButtonProps) {
    const [isCompleting, setIsCompleting] = useState(false);
    const router = useRouter();

    const handleComplete = async () => {
        if (!confirm('Are you sure you want to mark this order as completed? This indicates the customer has received the goods.')) {
            return;
        }

        setIsCompleting(true);

        try {
            const response = await fetch(`/api/orders/${orderId}/complete`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to complete order');
            }

            toast.success(data.message || 'Order completed successfully!');
            router.refresh();
        } catch (error) {
            console.error('Complete error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to complete order');
        } finally {
            setIsCompleting(false);
        }
    };

    if (status !== 'PROCESSING') {
        return null;
    }

    return (
        <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full py-2 px-4 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            <CheckCircle className="h-4 w-4" />
            {isCompleting ? 'Completing...' : 'Mark as Completed'}
        </button>
    );
}
