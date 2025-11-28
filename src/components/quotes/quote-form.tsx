'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, Calculator } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Customer {
    id: string;
    name: string;
    email: string;
    address: string | null;
    taxExempt: boolean;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
    category: string;
}

interface Location {
    id: string;
    name: string;
    code: string;
    taxRate: number;
}

interface QuoteItem {
    productId: string;
    product: Product;
    quantity: number;
    unitPrice: number;
    discount: number;
}

interface QuoteFormProps {
    customers: Customer[];
    products: Product[];
    locations: Location[];
}

const BULK_DISCOUNT_TIERS = [
    { minQty: 1000, discount: 0.15 },
    { minQty: 500, discount: 0.10 },
    { minQty: 100, discount: 0.05 },
];

export function QuoteForm({ customers, products, locations }: QuoteFormProps) {
    const router = useRouter();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(locations[0] || null);
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [validityDays, setValidityDays] = useState(30);
    const [submitting, setSubmitting] = useState(false);

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
                unitPrice: product.basePrice,
                discount: 0,
            }]);
        }
        setProductSearch('');
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setItems(items.filter(item => item.productId !== productId));
        } else {
            setItems(items.map(item => {
                if (item.productId === productId) {
                    // Calculate bulk discount
                    const bulkDiscount = BULK_DISCOUNT_TIERS.find(tier => quantity >= tier.minQty);
                    const discountedPrice = bulkDiscount
                        ? item.product.basePrice * (1 - bulkDiscount.discount)
                        : item.product.basePrice;

                    return { ...item, quantity, unitPrice: discountedPrice };
                }
                return item;
            }));
        }
    };

    const updateDiscount = (productId: string, discount: number) => {
        setItems(items.map(item =>
            item.productId === productId ? { ...item, discount } : item
        ));
    };

    const removeItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
        return sum + (item.unitPrice * item.quantity - item.discount);
    }, 0);

    const deliveryFee = deliveryAddress && subtotal < 1000 ? 100 : 0;
    const taxAmount = selectedCustomer?.taxExempt ? 0 : subtotal * (selectedLocation?.taxRate || 0.0825);
    const total = subtotal + deliveryFee + taxAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || !selectedLocation || items.length === 0) {
            toast.error('Please select a customer, location, and add at least one item', {
                duration: 5000,
            });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    locationId: selectedLocation.id,
                    items: items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                    })),
                    deliveryAddress: deliveryAddress || undefined,
                    notes,
                    validityDays,
                }),
            });

            if (response.ok) {
                toast.success('Quote created successfully!');
                router.push('/dashboard/quotes');
            } else {
                const data = await response.json();
                const errorMsg = data.error || 'Failed to create quote';
                toast.error(`Quote creation failed: ${errorMsg}`, {
                    duration: 6000,
                });
                console.error('Quote creation failed:', data);
            }
        } catch (error) {
            console.error('Quote creation error:', error);
            toast.error('Failed to create quote. Please try again.', {
                duration: 5000,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Selection */}
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Customer</h2>
                    <select
                        value={selectedCustomer?.id || ''}
                        onChange={(e) => {
                            const customer = customers.find(c => c.id === e.target.value);
                            setSelectedCustomer(customer || null);
                            if (customer?.address) {
                                setDeliveryAddress(customer.address);
                            }
                        }}
                        className="w-full px-3 py-2 rounded-lg border bg-background"
                        required
                    >
                        <option value="">Select customer...</option>
                        {customers.map(customer => (
                            <option key={customer.id} value={customer.id}>
                                {customer.name} - {customer.email}
                            </option>
                        ))}
                    </select>
                    {selectedCustomer?.taxExempt && (
                        <p className="mt-2 text-sm text-green-600 font-medium">Tax Exempt Customer</p>
                    )}
                </div>

                {/* Location Selection */}
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Location</h2>
                    <select
                        value={selectedLocation?.id || ''}
                        onChange={(e) => {
                            const location = locations.find(l => l.id === e.target.value);
                            setSelectedLocation(location || null);
                        }}
                        className="w-full px-3 py-2 rounded-lg border bg-background"
                        required
                    >
                        {locations.map(location => (
                            <option key={location.id} value={location.id}>
                                {location.name} ({location.code})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Product Selection */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Add Products</h2>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search products by name or SKU..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background"
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

                {/* Quote Items */}
                {items.length > 0 && (
                    <div className="space-y-3">
                        {items.map(item => {
                            const bulkDiscount = BULK_DISCOUNT_TIERS.find(tier => item.quantity >= tier.minQty);
                            const itemSubtotal = item.unitPrice * item.quantity - item.discount;

                            return (
                                <div key={item.productId} className="p-4 rounded-lg border bg-muted/50">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="font-mono text-xs text-muted-foreground">{item.product.sku}</div>
                                            <div className="font-medium">{item.product.name}</div>
                                            {bulkDiscount && (
                                                <div className="text-sm text-green-600 font-medium flex items-center gap-1">
                                                    <Calculator className="h-3 w-3" />
                                                    Bulk discount: {(bulkDiscount.discount * 100).toFixed(0)}% off
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.productId)}
                                            className="text-red-500 hover:text-red-700 p-1"
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
                                                ${item.unitPrice.toFixed(2)}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">Item Discount ($)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.discount}
                                                onChange={(e) => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-2 rounded border bg-background"
                                            />
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

            {/* Delivery & Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
                    <textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Enter delivery address (optional)"
                        className="w-full px-3 py-2 rounded-lg border bg-background"
                        rows={3}
                    />
                    {deliveryFee > 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            Delivery fee: ${deliveryFee.toFixed(2)}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Quote Settings</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium">Valid for (days)</label>
                            <input
                                type="number"
                                min="1"
                                max="90"
                                value={validityDays}
                                onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                                className="w-full px-3 py-2 rounded-lg border bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Internal notes (optional)"
                                className="w-full px-3 py-2 rounded-lg border bg-background"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Totals */}
            {items.length > 0 && (
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Quote Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {deliveryFee > 0 && (
                            <div className="flex justify-between">
                                <span>Delivery Fee:</span>
                                <span>${deliveryFee.toFixed(2)}</span>
                            </div>
                        )}
                        {selectedCustomer?.taxExempt ? (
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tax (Exempt):</span>
                                <span>$0.00</span>
                            </div>
                        ) : (
                            <div className="flex justify-between">
                                <span>Tax ({((selectedLocation?.taxRate || 0) * 100).toFixed(2)}%):</span>
                                <span>${taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || items.length === 0 || !selectedCustomer}
                        className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold hover:from-purple-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Creating Quote...' : 'Create Quote'}
                    </button>
                </div>
            )}
        </form>
    );
}
