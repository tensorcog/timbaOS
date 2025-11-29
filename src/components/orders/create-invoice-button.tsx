'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FileText } from 'lucide-react';

interface CreateInvoiceButtonProps {
    orderId: string;
    orderNumber: string;
    status: string;
}

export function CreateInvoiceButton({ orderId, orderNumber, status }: CreateInvoiceButtonProps) {
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();

    const handleCreateInvoice = async () => {
        setIsCreating(true);

        try {
            const response = await fetch(`/api/orders/${orderId}/invoice`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                // If invoice already exists, redirect to it
                if (data.invoiceId) {
                    toast.error('Invoice already exists');
                    router.push(`/dashboard/invoices/${data.invoiceId}`);
                    return;
                }
                throw new Error(data.error || 'Failed to create invoice');
            }

            toast.success(data.message || 'Invoice created successfully');
            router.push(`/dashboard/invoices/${data.invoice.id}`);
        } catch (error) {
            console.error('Create invoice error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
        } finally {
            setIsCreating(false);
        }
    };

    if (status !== 'PROCESSING' && status !== 'COMPLETED') {
        return null;
    }

    return (
        <button
            onClick={handleCreateInvoice}
            disabled={isCreating}
            className="w-full py-2 px-4 rounded-lg border border-blue-600 text-blue-600 font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            <FileText className="h-4 w-4" />
            {isCreating ? 'Creating Invoice...' : 'Create Invoice'}
        </button>
    );
}
