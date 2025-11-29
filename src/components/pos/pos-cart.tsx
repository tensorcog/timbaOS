'use client';

import { useState, useEffect } from 'react';
import { Trash2, ShoppingCart, Percent } from 'lucide-react';
import Decimal from 'decimal.js';

interface CartItem {
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    discount: number;
}

interface POSCartProps {
    items: CartItem[];
    customer: { taxExempt: boolean } | null;
    locationId: string;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onUpdateDiscount: (productId: string, discount: number) => void;
    onRemoveItem: (productId: string) => void;
    onCheckout: () => void;
}

export function POSCart({
    items,
    customer,
    locationId,
    onUpdateQuantity,
    onUpdateDiscount,
    onRemoveItem,
    onCheckout,
}: POSCartProps) {
    const [taxRate, setTaxRate] = useState<Decimal>(new Decimal(0.0825));
    const [orderDiscount, setOrderDiscount] = useState(0);

    useEffect(() => {
        // Fetch tax rate for location
        fetch(`/api/locations/${locationId}`)
            .then(res => res.json())
            .then(data => {
                if (data.taxRate) {
                    setTaxRate(new Decimal(data.taxRate));
                }
            })
            .catch(() => setTaxRate(new Decimal(0.0825)));
    }, [locationId]);

    // Calculate subtotal using Currency helper
    let subtotal = new Decimal(0);
    for (const item of items) {
        const itemPrice = new Decimal(item.price);
        const itemQuantity = item.quantity;
        const itemDiscount = new Decimal(item.discount);
        const itemTotal = itemPrice.times(itemQuantity).minus(itemDiscount);
        subtotal = subtotal.plus(itemTotal);
    }

    const discountAmount = new Decimal(orderDiscount);
    const taxableAmount = customer?.taxExempt
        ? new Decimal(0)
        : subtotal.minus(discountAmount);
    const taxAmount = taxableAmount.times(new Decimal(taxRate));
    const total = subtotal.minus(discountAmount).plus(taxAmount);

    return (
        <div className="rounded-xl border bg-card p-6 flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({items.length})
            </h2>

            {/* Cart Items */}
            <div className="flex-1 overflow-auto mb-4 space-y-2">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Cart is empty</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.productId} className="p-3 rounded-lg border bg-muted/50">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="font-mono text-xs text-muted-foreground">
                                        {item.sku}
                                    </div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        ${item.price.toFixed(2)} each
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveItem(item.productId)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center border rounded">
                                    <button
                                        onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                                        className="px-3 py-1 hover:bg-muted"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateQuantity(item.productId, parseInt(e.target.value) || 0)}
                                        className="w-16 text-center bg-transparent border-x py-1"
                                    />
                                    <button
                                        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                                        className="px-3 py-1 hover:bg-muted"
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 flex-1">
                                    <Percent className="h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="number"
                                        placeholder="Discount"
                                        value={item.discount || ''}
                                        onChange={(e) => onUpdateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                                        className="flex-1 px-2 py-1 rounded border bg-background text-sm"
                                    />
                                </div>
                            </div>

                            <div className="mt-2 text-right font-semibold">
                                ${((item.price * item.quantity) - item.discount).toFixed(2)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Order Discount */}
            {items.length > 0 && (
                <div className="mb-4 p-3 rounded-lg border bg-muted/30">
                    <label className="text-sm font-medium mb-2 block">Order Discount</label>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={orderDiscount || ''}
                            onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                            className="flex-1 px-3 py-2 rounded border bg-background"
                        />
                    </div>
                </div>
            )}

            {/* Totals */}
            {items.length > 0 && (
                <div className="space-y-2 mb-4 p-4 rounded-lg bg-muted/30">
                    <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${subtotal.toString()}</span>
                    </div>
                    {parseFloat(discountAmount.toString()) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Discount:</span>
                            <span>-${discountAmount.toString()}</span>
                        </div>
                    )}
                    {customer?.taxExempt ? (
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Tax (Exempt):</span>
                            <span>$0.00</span>
                        </div>
                    ) : (
                        <div className="flex justify-between text-sm">
                            <span>Tax ({parseFloat(taxRate.toString()) * 100}%):</span>
                            <span>${taxAmount.toString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span>${total.toString()}</span>
                    </div>
                </div>
            )}

            {/* Checkout Button */}
            <button
                onClick={onCheckout}
                disabled={items.length === 0 || !customer}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold hover:from-purple-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {!customer ? 'Select Customer First' : 'Proceed to Payment'}
            </button>
        </div>
    );
}
