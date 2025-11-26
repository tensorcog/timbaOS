'use client';

import { useCart } from '@/lib/context/cart-context';
import { ShoppingCart, Plus } from 'lucide-react';
import { useState } from 'react';

interface Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    basePrice: number;
    inventory: Array<{
        id: string;
        stockLevel: number;
        location: {
            code: string;
            name: string;
        };
    }>;
}

interface ProductListProps {
    products: Product[];
}

export function ProductList({ products }: ProductListProps) {
    const { addItem } = useCart();
    const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());

    const handleAddToCart = (product: Product) => {
        addItem({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: parseFloat(product.basePrice.toString()),
        });

        // Show feedback
        setAddedProducts(prev => new Set(prev).add(product.id));
        setTimeout(() => {
            setAddedProducts(prev => {
                const newSet = new Set(prev);
                newSet.delete(product.id);
                return newSet;
            });
        }, 1000);
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b">
                        <th className="text-left p-2">SKU</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Base Price</th>
                        <th className="text-left p-2">Total Stock</th>
                        <th className="text-left p-2">Locations</th>
                        <th className="text-left p-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => {
                        const totalStock = product.inventory.reduce((sum, inv) => sum + inv.stockLevel, 0);
                        const minStock = Math.min(...product.inventory.map(inv => inv.stockLevel));
                        const isAdded = addedProducts.has(product.id);

                        return (
                            <tr key={product.id} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="p-2 font-mono text-sm">{product.sku}</td>
                                <td className="p-2">{product.name}</td>
                                <td className="p-2">
                                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {product.category}
                                    </span>
                                </td>
                                <td className="p-2">${Number(product.basePrice).toFixed(2)}</td>
                                <td className="p-2">
                                    <span className={`font-semibold ${minStock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                        {totalStock}
                                    </span>
                                </td>
                                <td className="p-2">
                                    <div className="flex gap-1">
                                        {product.inventory.map((inv) => (
                                            <span
                                                key={inv.id}
                                                className="text-xs px-1.5 py-0.5 rounded bg-muted"
                                                title={`${inv.location.name}: ${inv.stockLevel}`}
                                            >
                                                {inv.location.code}:{inv.stockLevel}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-2">
                                    <button
                                        onClick={() => handleAddToCart(product)}
                                        disabled={totalStock === 0}
                                        className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${isAdded
                                                ? 'bg-green-600 text-white'
                                                : totalStock === 0
                                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:from-purple-600 hover:to-blue-700'
                                            }`}
                                    >
                                        {isAdded ? (
                                            <>
                                                <ShoppingCart className="h-4 w-4" />
                                                Added!
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" />
                                                Add to Cart
                                            </>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
