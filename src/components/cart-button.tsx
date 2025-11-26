'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/context/cart-context';

interface CartButtonProps {
    onClick: () => void;
}

export function CartButton({ onClick }: CartButtonProps) {
    const { itemCount } = useCart();

    return (
        <button
            onClick={onClick}
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
        >
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {itemCount > 99 ? '99+' : itemCount}
                </span>
            )}
            <span className="sr-only">Shopping cart ({itemCount} items)</span>
        </button>
    );
}
