'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { DollarSign, X } from 'lucide-react';

interface RecordPaymentDialogProps {
    invoiceId: string;
    customerId: string;
    balanceDue: number;
    onClose: () => void;
}

export function RecordPaymentDialog({ invoiceId, customerId, balanceDue, onClose }: RecordPaymentDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const [formData, setFormData] = useState({
        amount: balanceDue,
        paymentMethod: 'CHECK',
        referenceNumber: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/invoice-payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoiceId,
                    customerId,
                    ...formData,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to record payment');
            }

            toast.success('Payment recorded successfully');
            router.refresh();
            onClose();
        } catch (error) {
            console.error('Payment error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 mb-6">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Record Payment</h2>
                        <p className="text-sm text-muted-foreground">Balance Due: ${balanceDue.toFixed(2)}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Amount ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                            className="w-full rounded-md border bg-background px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Payment Date</label>
                        <input
                            type="date"
                            required
                            value={formData.paymentDate}
                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            className="w-full rounded-md border bg-background px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Payment Method</label>
                        <select
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                            className="w-full rounded-md border bg-background px-3 py-2"
                        >
                            <option value="CASH">Cash</option>
                            <option value="CHECK">Check</option>
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="DEBIT_CARD">Debit Card</option>
                            <option value="ACH">ACH / Bank Transfer</option>
                            <option value="WIRE_TRANSFER">Wire Transfer</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Reference Number</label>
                        <input
                            type="text"
                            placeholder="e.g. Check #1234 or Trans ID"
                            value={formData.referenceNumber}
                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                            className="w-full rounded-md border bg-background px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full rounded-md border bg-background px-3 py-2 h-20 resize-none"
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md border hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
