'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
    category: string;
}

interface OrderItem {
    productId: string;
    product: Product;
    quantity: number;
    price: number;
    discount: number;
}

interface Customer {
    id: string;
    name: string;
    email: string;
    taxExempt: boolean;
}

interface Location {
    id: string;
    name: string;
    code: string;
    taxRate: number;
}

interface OrderEditFormProps {
    order: {
        id: string;
        orderNumber: string;
        customerId: string;
        locationId: string;
        deliveryAddress: string | null;
        deliveryDate: string | null;
        fulfillmentType: string;
        items: OrderItem[];
    };
    customers: Customer[];
    locations: Location[];
    products: Product[];
}

export function OrderEditForm({ order, customers, locations, products }: OrderEditFormProps) {
    const router = useRouter();
    const [items, setItems] = useState<OrderItem[]>(order.items);
    const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress || '');
    const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : '');
    const [fulfillmentType, setFulfillmentType] = useState(order.fulfillmentType || 'PICKUP');
    const [productSearch, setProductSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const selectedCustomer = customers.find(c => c.id === order.customerId);
    const selectedLocation = locations.find(l => l.id === order.locationId);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    );

    const addItem = (product: Product) => {
        const existing = items.find(item => item.productId === product.id);
        if (existing) {
            setItems(items.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setItems([...items, {
                productId: product.id,
                product,
                quantity: 1,
                price: product.basePrice,
                discount: 0,
            }]);
        }
        setProductSearch('');
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            if (items.length === 1) {
                toast.error('Cannot remove the last item from an order');
                return;
            }
            setItems(items.filter(item => item.productId !== productId));
        } else {
            setItems(items.map(item =>
                item.productId === productId ? { ...item, quantity } : item
            ));
        }
    };

    const removeItem = (productId: string) => {
        if (items.length <= 1) {
            toast.error('Cannot remove the last item from an order');
            return;
        }
        setItems(items.filter(item => item.productId !== productId));
    };

    const subtotal = items.reduce((sum, item) => {
        return sum + (item.price * item.quantity - item.discount);
    }, 0);

    const taxAmount = selectedCustomer?.taxExempt ? 0 : subtotal * (selectedLocation?.taxRate || 0);
    const total = subtotal + taxAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (items.length === 0) {
            toast.error('Order must have at least one item');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                    deliveryAddress,
                    deliveryDate,
                    fulfillmentType,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update order');
            }

            toast.success('Order updated successfully!');
            router.push(`/dashboard/orders/${order.id}`);
            router.refresh();
        } catch (error) {
            console.error('Order update error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update order');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer & Location Info (Read-only) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Customer</h2>
                    <div className="px-3 py-2 rounded-lg border bg-muted">
                        <div className="font-medium">{selectedCustomer?.name}</div>
                        <div className="text-sm text-muted-foreground">{selectedCustomer?.email}</div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Location</h2>
                    <div className="px-3 py-2 rounded-lg border bg-muted">
                        <div className="font-medium">{selectedLocation?.name} ({selectedLocation?.code})</div>
                    </div>
                </div>
            </div>

            {/* Order Items */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Order Items</h2>

                {/* Product Search */}
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Search products to add..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 rounded-lg border bg-background"
                    />
                </div>

                {productSearch && filteredProducts.length > 0 && (
                    <div className="mb-4 max-h-48 overflow-auto border rounded-lg">
                        {filteredProducts.slice(0, 10).map(product => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => addItem(product)}
                                className="w-full text-left p-3 hover:bg-muted transition-colors border-b last:border-b-0"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {product.sku} • {product.category}
                                        </div>
                                    </div>
                                    <div className="text-lg font-semibold text-green-600">
                                        ${product.basePrice.toFixed(2)}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {items.length > 0 && (
                    <div className="space-y-3">
                        {items.map(item => {
                            const itemSubtotal = item.price * item.quantity - item.discount;

                            return (
                                <div key={item.productId} className="p-4 rounded-lg border bg-muted/50">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="font-mono text-xs text-muted-foreground">{item.product.sku}</div>
                                            <div className="font-medium">{item.product.name}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.productId)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground">Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 rounded border bg-background"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">Unit Price</label>
                                            <div className="px-3 py-2 rounded border bg-muted text-sm">
                                                ${item.price.toFixed(2)}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">Discount</label>
                                            <div className="px-3 py-2 rounded border bg-muted text-sm">
                                                ${item.discount.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-right font-semibold">
                                        Subtotal: ${itemSubtotal.toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delivery & Fulfillment */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Delivery & Fulfillment</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Fulfillment Type</label>
                        <select
                            value={fulfillmentType}
                            onChange={(e) => setFulfillmentType(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border bg-background"
                        >
                            <option value="PICKUP">Pickup</option>
                            <option value="DELIVERY">Delivery</option>
                            <option value="WILL_CALL">Will Call</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Delivery/Pickup Date</label>
                        <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border bg-background"
                        />
                    </div>
                </div>
                <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Delivery address (optional)"
                    className="w-full px-3 py-2 rounded-lg border bg-background"
                    rows={3}
                />
            </div>

            {/* Totals */}
            {items.length > 0 && (
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax ({((selectedLocation?.taxRate || 0) * 100).toFixed(2)}%):</span>
                            <span>${taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || items.length === 0}
                        className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold hover:from-purple-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Updating Order...' : 'Update Order'}
                    </button>
                </div>
            )}
        </form>
    );
}
