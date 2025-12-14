'use client';

import { useCart } from '@/lib/context/cart-context';
import { useLocation } from '@/lib/context/location-context';
import { CustomerLookup } from '@/components/pos/customer-lookup';
import { PaymentPanel } from '@/components/pos/payment-panel';
import { ProductRecommendations } from '@/components/product-recommendations';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
    const router = useRouter();
    const { items, subtotal, clearCart } = useCart();
    const { selectedLocation } = useLocation();
    const [customer, setCustomer] = useState<{
        id: string;
        name: string;
        email: string;
        taxExempt: boolean;
    } | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [taxRate, setTaxRate] = useState(0.0825);

    // Redirect if cart is empty
    useEffect(() => {
        if (items.length === 0) {
            router.push('/dashboard/products');
        }
    }, [items.length, router]);

    // Fetch tax rate for location
    useEffect(() => {
        if (selectedLocation) {
            fetch(`/api/locations/${selectedLocation}`)
                .then(res => res.json())
                .then(data => setTaxRate(parseFloat(data.taxRate) || 0.0825))
                .catch(() => setTaxRate(0.0825));
        }
    }, [selectedLocation]);

    const taxAmount = customer?.taxExempt ? 0 : subtotal * taxRate;
    const total = subtotal + taxAmount;

    const handleCheckout = () => {
        if (!customer) {
            alert('Please select a customer');
            return;
        }
        setShowPayment(true);
    };

    const handleComplete = () => {
        clearCart();
        router.push('/dashboard/orders');
    };

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/products"
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-semibold">Checkout</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Customer Selection */}
                <div className="lg:col-span-2 space-y-6">
                    <CustomerLookup
                        customer={customer}
                        onSelectCustomer={setCustomer}
                    />

                    {/* Order Summary */}
                    <div className="rounded-xl border bg-card p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Order Summary
                        </h2>
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.productId}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                                >
                                    <div className="flex-1">
                                        <div className="font-mono text-xs text-muted-foreground">
                                            {item.sku}
                                        </div>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            ${item.price.toFixed(2)} × {item.quantity}
                                        </div>
                                    </div>
                                    <div className="font-semibold">
                                        ${((item.price * item.quantity) - item.discount).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Totals and Checkout */}
                <div className="space-y-6">
                    <div className="rounded-xl border bg-card p-6">
                        <h2 className="text-lg font-semibold mb-4">Order Total</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal:</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            {customer?.taxExempt ? (
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Tax (Exempt):</span>
                                    <span>$0.00</span>
                                </div>
                            ) : (
                                <div className="flex justify-between text-sm">
                                    <span>Tax ({(taxRate * 100).toFixed(2)}%):</span>
                                    <span>${taxAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                <span>Total:</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={!customer}
                            className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-700 text-white font-semibold hover:from-amber-700 hover:to-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {!customer ? 'Select Customer First' : 'Proceed to Payment'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Recommendations */}
            <div className="mt-6">
                <ProductRecommendations />
            </div>

            {/* Payment Panel */}
            {showPayment && customer && selectedLocation && (
                <PaymentPanel
                    cart={items}
                    customer={customer}
                    locationId={selectedLocation}
                    onComplete={handleComplete}
                    onCancel={() => setShowPayment(false)}
                />
            )}
        </div>
    );
}
