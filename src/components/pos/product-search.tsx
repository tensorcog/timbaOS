'use client';

import { useState, useEffect } from 'react';
import { Search, Package } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    stockLevel: number;
}

interface ProductSearchProps {
    locationId: string;
    onAddToCart: (product: { id: string; name: string; sku: string; price: number }) => void;
}

export function ProductSearch({ locationId, onAddToCart }: ProductSearchProps) {
    const [query, setQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchProducts = async () => {
            if (query.length < 2) {
                setProducts([]);
                return;
            }

            setLoading(true);
            try {
                const response = await fetch(`/api/pos/products?q=${encodeURIComponent(query)}&locationId=${locationId}`);
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error('Failed to search products:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchProducts, 300);
        return () => clearTimeout(debounce);
    }, [query, locationId]);

    return (
        <div className="rounded-xl border bg-card p-6 h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Products</h2>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by SKU or product name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                />
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Searching...
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{query.length < 2 ? 'Start typing to search products' : 'No products found'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {products.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => onAddToCart(product)}
                                className="text-left p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <div className="font-mono text-xs text-muted-foreground mb-1">
                                    {product.sku}
                                </div>
                                <div className="font-medium mb-2 line-clamp-2">
                                    {product.name}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-green-600">
                                        ${product.price.toFixed(2)}
                                    </span>
                                    <span className={`text-sm ${product.stockLevel < 10 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        Stock: {product.stockLevel}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
