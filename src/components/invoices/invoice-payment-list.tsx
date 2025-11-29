import { format } from "date-fns";

interface Payment {
    id: string;
    amount: any;
    paymentMethod: string;
    paymentDate: Date;
    referenceNumber: string | null;
    notes: string | null;
    RecordedBy: {
        name: string;
    };
}

export function InvoicePaymentList({ payments }: { payments: Payment[] }) {
    if (payments.length === 0) {
        return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>;
    }

    return (
        <div className="space-y-4">
            {payments.map((payment) => (
                <div key={payment.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                        <div className="font-medium">
                            {payment.paymentMethod.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.paymentDate), "MMM d, yyyy")} • by {payment.RecordedBy.name}
                        </div>
                        {payment.referenceNumber && (
                            <div className="text-xs text-muted-foreground mt-1">
                                Ref: {payment.referenceNumber}
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="font-semibold text-green-600">
                            ${Number(payment.amount).toFixed(2)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
