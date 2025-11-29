'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { RecordPaymentDialog } from './record-payment-dialog';

interface RecordPaymentButtonProps {
    invoiceId: string;
    customerId: string;
    balanceDue: number;
}

export function RecordPaymentButton({ invoiceId, customerId, balanceDue }: RecordPaymentButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
            >
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
            </button>

            {isOpen && (
                <RecordPaymentDialog
                    invoiceId={invoiceId}
                    customerId={customerId}
                    balanceDue={balanceDue}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
