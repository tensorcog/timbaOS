'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ProductSearch } from './pos/product-search';
import { POSCart } from './pos/pos-cart';
import { CustomerLookup } from './pos/customer-lookup';
import { PaymentPanel } from './pos/payment-panel';

interface POSModalProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
}

export function POSModal({ isOpen, onClose, locationId }: POSModalProps) {
    const [cart, setCart] = useState<Array<{
        productId: string;
        name: string;
        sku: string;
        price: number;
        quantity: number;
        discount: number;
    }>>([]);
    const [customer, setCustomer] = useState<{
        id: string;
        name: string;
        email: string;
        taxExempt: boolean;
    } | null>(null);
    const [showPayment, setShowPayment] = useState(false);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const addToCart = (product: { id: string; name: string; sku: string; price: number }) => {
        const existing = cart.find(item => item.productId === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                quantity: 1,
                discount: 0,
            }]);
        }
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart(cart.filter(item => item.productId !== productId));
        } else {
            setCart(cart.map(item =>
                item.productId === productId ? { ...item, quantity } : item
            ));
        }
    };

    const updateDiscount = (productId: string, discount: number) => {
        setCart(cart.map(item =>
            item.productId === productId ? { ...item, discount } : item
        ));
    };

    const removeItem = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setCustomer(null);
        setShowPayment(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
            <div className="h-full w-full bg-background">
                {/* Header */}
                <div className="flex items-center justify-between border-b bg-card px-6 py-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent">
                        Point of Sale
                    </h1>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-muted transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
                    {/* Left: Product Search */}
                    <div className="lg:col-span-2 overflow-auto">
                        <ProductSearch
                            locationId={locationId}
                            onAddToCart={addToCart}
                        />
                    </div>

                    {/* Right: Cart, Customer, Payment */}
                    <div className="flex flex-col gap-4 overflow-auto">
                        <CustomerLookup
                            customer={customer}
                            onSelectCustomer={setCustomer}
                        />

                        <POSCart
                            items={cart}
                            customer={customer}
                            locationId={locationId}
                            onUpdateQuantity={updateQuantity}
                            onUpdateDiscount={updateDiscount}
                            onRemoveItem={removeItem}
                            onCheckout={() => setShowPayment(true)}
                        />

                        {showPayment && cart.length > 0 && customer && (
                            <PaymentPanel
                                cart={cart}
                                customer={customer}
                                locationId={locationId}
                                onComplete={clearCart}
                                onCancel={() => setShowPayment(false)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
