'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    discount: number;
}

interface CartContextType {
    items: CartItem[];
    addItem: (product: { id: string; name: string; sku: string; price: number }) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    updateDiscount: (productId: string, discount: number) => void;
    clearCart: () => void;
    itemCount: number;
    subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart));
            } catch (error) {
                console.error('Failed to load cart:', error);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(items));
    }, [items]);

    const addItem = (product: { id: string; name: string; sku: string; price: number }) => {
        setItems(currentItems => {
            const existing = currentItems.find(item => item.productId === product.id);
            if (existing) {
                return currentItems.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...currentItems, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                quantity: 1,
                discount: 0,
            }];
        });
    };

    const removeItem = (productId: string) => {
        setItems(currentItems => currentItems.filter(item => item.productId !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(productId);
        } else {
            setItems(currentItems =>
                currentItems.map(item =>
                    item.productId === productId ? { ...item, quantity } : item
                )
            );
        }
    };

    const updateDiscount = (productId: string, discount: number) => {
        setItems(currentItems =>
            currentItems.map(item =>
                item.productId === productId ? { ...item, discount } : item
            )
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity - item.discount), 0);

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateQuantity,
                updateDiscount,
                clearCart,
                itemCount,
                subtotal,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
