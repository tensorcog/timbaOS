'use client';

import { X, Trash2, ShoppingCart, Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/context/cart-context';
import Link from 'next/link';

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
    const { items, removeItem, updateQuantity, itemCount, subtotal } = useCart();

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-card border-l z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Cart ({itemCount})
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-auto p-4">
                    {items.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p>Your cart is empty</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.productId}
                                    className="p-3 rounded-lg border bg-muted/50"
                                >
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
                                            onClick={() => removeItem(item.productId)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center border rounded">
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                className="p-2 hover:bg-muted"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="px-4 py-1 min-w-[3rem] text-center">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                className="p-2 hover:bg-muted"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>

                                        <div className="font-semibold">
                                            ${((item.price * item.quantity) - item.discount).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t p-4 space-y-4">
                        <div className="flex justify-between text-lg font-bold">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <Link
                            href="/dashboard/checkout"
                            onClick={onClose}
                            className="block w-full py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-700 text-white font-semibold text-center hover:from-amber-700 hover:to-orange-800 transition-all"
                        >
                            Proceed to Checkout
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}
