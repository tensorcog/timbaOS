'use client';

import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Check, Wallet, X } from 'lucide-react';
import Decimal from 'decimal.js';

interface CartItem {
    productId: string;
    price: number;
    quantity: number;
    discount: number;
}

interface PaymentPanelProps {
    cart: CartItem[];
    customer: { id: string; name: string; taxExempt: boolean };
    locationId: string;
    onComplete: () => void;
    onCancel: () => void;
}

const PAYMENT_METHODS = [
    { id: 'CASH', label: 'Cash', icon: DollarSign },
    { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
    { id: 'DEBIT_CARD', label: 'Debit Card', icon: CreditCard },
    { id: 'CHECK', label: 'Check', icon: Check },
    { id: 'STORE_CREDIT', label: 'Store Credit', icon: Wallet },
];

export function PaymentPanel({ cart, customer, locationId, onComplete, onCancel }: PaymentPanelProps) {
    const [payments, setPayments] = useState<Array<{ method: string; amount: number }>>([]);
    const [selectedMethod, setSelectedMethod] = useState('CASH');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [cashTendered, setCashTendered] = useState('');
    const [processing, setProcessing] = useState(false);
    const [taxRate, setTaxRate] = useState<Decimal>(new Decimal(0.0825));

    // Fetch tax rate for location
    useEffect(() => {
        fetch(`/api/locations/${locationId}`)
            .then(res => res.json())
            .then(data => {
                if (data.taxRate) {
                    setTaxRate(new Decimal(data.taxRate));
                }
            })
            .catch(() => setTaxRate(new Decimal(0.0825)));
    }, [locationId]);

    // Calculate totals using Currency helper for precision
    let subtotal = new Decimal(0);
    for (const item of cart) {
        const itemPrice = new Decimal(item.price);
        const itemQuantity = item.quantity;
        const itemDiscount = new Decimal(item.discount);
        const itemLineTotal = itemPrice.times(itemQuantity).minus(itemDiscount);
        subtotal = subtotal.plus(itemLineTotal);
    }

    // Calculate tax with proper precision
    const taxAmount = customer.taxExempt
        ? new Decimal(0)
        : subtotal.times(new Decimal(taxRate));

    const total = subtotal.plus(taxAmount);

    // Calculate paid amount using Currency
    let paidAmount = new Decimal(0);
    for (const p of payments) {
        paidAmount = paidAmount.plus(new Decimal(p.amount));
    }

    const remaining = total.minus(paidAmount);
    const remainingNum = parseFloat(remaining.toString());

    const addPayment = () => {
        const amount = parseFloat(paymentAmount);
        if (!paymentAmount || isNaN(amount)) {
            alert('Please enter a valid amount');
            return;
        }
        if (amount <= 0) {
            alert('Amount must be greater than zero');
            return;
        }
        if (amount > remainingNum) {
            alert(`Amount cannot exceed remaining balance of $${remainingNum.toFixed(2)}`);
            return;
        }
        setPayments([...payments, { method: selectedMethod, amount }]);
        setPaymentAmount('');
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const completeTransaction = async () => {
        if (remainingNum > 0.01) {
            alert('Payment incomplete');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch('/api/pos/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customer.id,
                    locationId,
                    items: cart.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        discount: item.discount,
                    })),
                    payments,
                }),
            });

            if (response.ok) {
                const order = await response.json();
                // Show receipt or success message
                alert(`Order ${order.orderNumber} completed!`);
                onComplete();
            } else {
                alert('Failed to process order');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to process order');
        } finally {
            setProcessing(false);
        }
    };

    const change = selectedMethod === 'CASH' && cashTendered
        ? parseFloat(cashTendered) - remainingNum
        : 0;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border max-w-2xl w-full max-h-[90vh] overflow-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Payment</h2>
                        <button onClick={onCancel} className="p-2 hover:bg-muted rounded-full">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Total Due */}
                    <div className="mb-6 p-6 rounded-lg bg-gradient-to-r from-amber-600/20 to-orange-600/20 border">
                        <div className="text-sm text-muted-foreground mb-1">Amount Due</div>
                        <div className="text-4xl font-bold">${remaining.toFixed(2)}</div>
                        {parseFloat(paidAmount.toString()) > 0 && (
                            <div className="text-sm text-muted-foreground mt-2">
                                Paid: ${paidAmount.toFixed(2)} of ${total.toFixed(2)}
                            </div>
                        )}
                    </div>

                    {/* Payment Methods */}
                    <div className="mb-6">
                        <label className="text-sm font-medium mb-2 block">Payment Method</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {PAYMENT_METHODS.map((method) => {
                                const Icon = method.icon;
                                return (
                                    <button
                                        key={method.id}
                                        onClick={() => setSelectedMethod(method.id)}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${selectedMethod === method.id
                                            ? 'bg-purple-500/20 border-amber-500'
                                            : 'hover:bg-muted'
                                            }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-sm">{method.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cash Tendered */}
                    {selectedMethod === 'CASH' && remainingNum > 0 && (
                        <div className="mb-6">
                            <label className="text-sm font-medium mb-2 block">Cash Tendered</label>
                            <input
                                type="number"
                                step="0.01"
                                value={cashTendered}
                                onChange={(e) => setCashTendered(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border bg-background text-lg"
                                placeholder="0.00"
                            />
                            {change > 0 && (
                                <div className="mt-2 text-lg font-semibold text-green-600">
                                    Change: ${change.toFixed(2)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Amount (for split payments) */}
                    {remainingNum > 0 && (
                        <div className="mb-6">
                            <label className="text-sm font-medium mb-2 block">Amount</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addPayment();
                                        }
                                    }}
                                    className="flex-1 px-4 py-3 rounded-lg border bg-background"
                                    placeholder={remaining.toFixed(2)}
                                />
                                <button
                                    onClick={() => setPaymentAmount(remaining.toFixed(2))}
                                    className="px-4 py-2 rounded-lg border hover:bg-muted"
                                >
                                    Exact
                                </button>
                                <button
                                    onClick={addPayment}
                                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                                    className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Applied Payments */}
                    {payments.length > 0 && (
                        <div className="mb-6">
                            <label className="text-sm font-medium mb-2 block">Applied Payments</label>
                            <div className="space-y-2">
                                {payments.map((payment, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                        <span>{payment.method.replace('_', ' ')}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold">${payment.amount.toFixed(2)}</span>
                                            <button
                                                onClick={() => removePayment(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Complete Button */}
                    <button
                        onClick={completeTransaction}
                        disabled={remainingNum > 0.01 || processing}
                        className="w-full py-4 rounded-lg bg-gradient-to-r from-amber-600 to-orange-700 text-white font-bold text-lg hover:from-amber-700 hover:to-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Processing...' : remainingNum > 0.01 ? `$${remaining.toFixed(2)} Remaining` : 'Complete Transaction'}
                    </button>
                </div>
            </div>
        </div>
    );
}
