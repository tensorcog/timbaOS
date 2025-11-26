'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/lib/context/cart-context';
import { Sparkles, Plus } from 'lucide-react';

interface Recommendation {
    product: {
        id: string;
        name: string;
        sku: string;
        price: number;
    };
    strength: number;
    reason: string;
}

export function ProductRecommendations() {
    const { items, addItem } = useCart();
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (items.length === 0) {
            setRecommendations([]);
            return;
        }

        const fetchRecommendations = async () => {
            setLoading(true);
            try {
                const productIds = items.map(item => item.productId).join(',');
                const response = await fetch(`/api/recommendations?productIds=${productIds}`);
                if (response.ok) {
                    const data = await response.json();
                    setRecommendations(data);
                }
            } catch (error) {
                console.error('Failed to fetch recommendations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [items]);

    if (recommendations.length === 0) {
        return null;
    }

    const getReasonText = (reason: string) => {
        switch (reason) {
            case 'frequently_bought_together':
                return 'Customers also bought';
            case 'project_bundle':
                return 'Complete your project';
            case 'upsell':
                return 'You might also like';
            default:
                return 'Recommended';
        }
    };

    return (
        <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Recommended for You
            </h2>

            {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                    Loading recommendations...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {recommendations.map((rec) => (
                        <div
                            key={rec.product.id}
                            className="p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                        >
                            <div className="text-xs text-purple-600 font-medium mb-2">
                                {getReasonText(rec.reason)}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground mb-1">
                                {rec.product.sku}
                            </div>
                            <div className="font-medium mb-2 line-clamp-2">
                                {rec.product.name}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-green-600">
                                    ${rec.product.price.toFixed(2)}
                                </span>
                                <button
                                    onClick={() => addItem(rec.product)}
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white text-sm font-medium hover:from-purple-600 hover:to-blue-700 transition-all flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
