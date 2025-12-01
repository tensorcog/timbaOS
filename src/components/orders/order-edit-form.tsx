'use client';

import { useState, useEffect, useMemo } from 'react';
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
    id?: string;
    productId: string;
    product: Product;
    quantity: number;
    price: number;
    discount: number;
}

interface ShipmentItem {
    id: string;
    orderItemId: string;
    quantity: number;
    OrderItem?: {
        id: string;
        product?: Product;
    };
}

interface Shipment {
    id: string;
    orderId: string;
    scheduledDate: string | null;
    status: 'PENDING' | 'SCHEDULED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    method: 'DELIVERY' | 'PICKUP' | 'WILL_CALL';
    carrier: string | null;
    trackingNumber: string | null;
    ShipmentItem?: ShipmentItem[];
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
    
    // Shipment state with proper types
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [showShipmentDialog, setShowShipmentDialog] = useState(false);
    const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
    const [isSavingShipment, setIsSavingShipment] = useState(false);
    const [shipmentError, setShipmentError] = useState('');
    const [shipmentFormData, setShipmentFormData] = useState({
        scheduledDate: '',
        method: 'DELIVERY',
        carrier: '',
        trackingNumber: '',
        items: [] as { orderItemId: string; quantity: number }[]
    });

    const selectedCustomer = customers.find(c => c.id === order.customerId);
    const selectedLocation = locations.find(l => l.id === order.locationId);

    // Fetch shipments on mount
    useEffect(() => {
        const fetchShipments = async () => {
            try {
                const res = await fetch(`/api/orders/${order.id}/shipments`);
                if (res.ok) {
                    const data = await res.json();
                    setShipments(data.shipments || []);
                }
            } catch (error) {
                console.error('Error fetching shipments:', error);
            }
        };
        fetchShipments();
    }, [order.id]);

    // Calculate shipped quantity map (optimized with useMemo)
    const shippedByItem = useMemo(() => {
        const map: Record<string, number> = {};
        shipments.forEach(shipment => {
            if (shipment.status === 'CANCELLED') return;
            shipment.ShipmentItem?.forEach((si: ShipmentItem) => {
                map[si.orderItemId] = (map[si.orderItemId] || 0) + si.quantity;
            });
        });
        return map;
    }, [shipments]);

    // Calculate shipped quantity for an order item (O(1) lookup)
    const calculateShippedQuantity = (orderItemId: string) => {
        return shippedByItem[orderItemId] || 0;
    };

    // Reset shipment form
    const resetShipmentForm = () => {
        setShipmentFormData({
            scheduledDate: '',
            method: 'DELIVERY',
            carrier: '',
            trackingNumber: '',
            items: []
        });
        setShipmentError('');
    };

    // Handle edit shipment
    const handleEditShipment = (shipment: any) => {
        setEditingShipment(shipment);
        setShipmentFormData({
            scheduledDate: shipment.scheduledDate ? new Date(shipment.scheduledDate).toISOString().split('T')[0] : '',
            method: shipment.method || 'DELIVERY',
            carrier: shipment.carrier || '',
            trackingNumber: shipment.trackingNumber || '',
            items: [] // Cannot edit items, only metadata
        });
        setShowShipmentDialog(true);
    };

    // Handle delete shipment
    const handleDeleteShipment = async (shipmentId: string) => {
        if (!confirm('Are you sure you want to delete this shipment?')) return;
        
        try {
            const res = await fetch(`/api/orders/${order.id}/shipments/${shipmentId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Shipment deleted successfully');
                setShipments(shipments.filter(s => s.id !== shipmentId));
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete shipment');
            }
        } catch (error) {
            toast.error('Failed to delete shipment');
        }
    };

    // Handle save shipment
    const handleSaveShipment = async () => {
        setShipmentError('');
        setIsSavingShipment(true);

        try {
            if (editingShipment) {
                // Update existing shipment
                const res = await fetch(`/api/orders/${order.id}/shipments/${editingShipment.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scheduledDate: shipmentFormData.scheduledDate,
                        method: shipmentFormData.method,
                        carrier: shipmentFormData.carrier || null,
                        trackingNumber: shipmentFormData.trackingNumber || null
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    setShipments(shipments.map(s => s.id === editingShipment.id ? data.shipment : s));
                    toast.success('Shipment updated successfully');
                    setShowShipmentDialog(false);
                    setEditingShipment(null);
                    resetShipmentForm();
                } else {
                    const data = await res.json();
                    setShipmentError(data.error || 'Failed to update shipment');
                }
            } else {
                // Create new shipment
                if (shipmentFormData.items.length === 0) {
                    setShipmentError('Please select at least one item to ship');
                    return;
                }

                const res = await fetch(`/api/orders/${order.id}/shipments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scheduledDate: shipmentFormData.scheduledDate,
                        method: shipmentFormData.method,
                        carrier: shipmentFormData.carrier || null,
                        trackingNumber: shipmentFormData.trackingNumber || null,
                        items: shipmentFormData.items
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    setShipments([data.shipment, ...shipments]);
                    toast.success('Shipment created successfully');
                    setShowShipmentDialog(false);
                    resetShipmentForm();
                } else {
                    const data = await res.json();
                    setShipmentError(data.error || 'Failed to create shipment');
                }
            }
        } catch (error) {
            setShipmentError('An error occurred while saving the shipment');
        } finally {
            setIsSavingShipment(false);
        }
    };

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

            {/* Shipments */}
            <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Shipments</h2>
                    <button
                        type="button"
                        onClick={() => {
                            resetShipmentForm();
                            setShowShipmentDialog(true);
                        }}
                        className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                        + Create Shipment
                    </button>
                </div>
                
                {/* Shipments List */}
                <div className="space-y-3">
                    {shipments.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                            No shipments created yet. Create a shipment to schedule delivery or pickup.
                        </div>
                    ) : (
                        shipments.map((shipment) => (
                            <div key={shipment.id} className="border rounded-lg p-4 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                                                shipment.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                shipment.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                                                shipment.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {shipment.status}
                                            </span>
                                            <span className="text-sm font-medium">{shipment.method}</span>
                                        </div>
                                        {shipment.scheduledDate && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                Scheduled: {new Date(shipment.scheduledDate).toLocaleDateString()}
                                            </div>
                                        )}
                                        {shipment.carrier && (
                                            <div className="text-sm text-muted-foreground">
                                                Carrier: {shipment.carrier}
                                                {shipment.trackingNumber && ` - Tracking: ${shipment.trackingNumber}`}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {(shipment.status === 'PENDING' || shipment.status === 'SCHEDULED') && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditShipment(shipment)}
                                                    className="px-2 py-1 text-xs border rounded hover:bg-muted"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteShipment(shipment.id)}
                                                    className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium">Items:</span>{' '}
                                    {shipment.ShipmentItem.map((si: any) => 
                                        `${si.OrderItem.Product.name} (${si.quantity})`
                                    ).join(', ')}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Unshipped Items Summary */}
                {items.length > 0 && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-2">Unshipped Quantities:</div>
                        {items.map((item) => {
                            if (!item.id) return null;
                            const shipped = calculateShippedQuantity(item.id);
                            const remaining = item.quantity - shipped;
                            if (remaining > 0) {
                                return (
                                    <div key={item.id} className="text-sm text-muted-foreground">
                                        {item.product?.name || 'Unknown'}: {remaining} of {item.quantity} remaining
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}
            </div>

            {/* Shipment Dialog */}
            {showShipmentDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShipmentDialog(false)}>
                    <div className="bg-card text-card-foreground rounded-xl border shadow-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">
                            {editingShipment ? 'Edit Shipment' : 'Create Shipment'}
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Scheduled Date */}
                            <div>
                                <label className="text-sm font-medium mb-1 block">Scheduled Date</label>
                                <input
                                    type="date"
                                    value={shipmentFormData.scheduledDate}
                                    onChange={(e) => setShipmentFormData({ ...shipmentFormData, scheduledDate: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border bg-background"
                                />
                            </div>

                            {/* Method */}
                            <div>
                                <label className="text-sm font-medium mb-1 block">Method</label>
                                <select
                                    value={shipmentFormData.method}
                                    onChange={(e) => setShipmentFormData({ ...shipmentFormData, method: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border bg-background"
                                >
                                    <option value="DELIVERY">Delivery</option>
                                    <option value="PICKUP">Pickup</option>
                                    <option value="WILL_CALL">Will Call</option>
                                </select>
                            </div>

                            {/* Carrier & Tracking */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Carrier (Optional)</label>
                                    <input
                                        type="text"
                                        value={shipmentFormData.carrier}
                                        onChange={(e) => setShipmentFormData({ ...shipmentFormData, carrier: e.target.value })}
                                        placeholder="e.g. UPS, FedEx"
                                        className="w-full px-3 py-2 rounded-lg border bg-background"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Tracking Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={shipmentFormData.trackingNumber}
                                        onChange={(e) => setShipmentFormData({ ...shipmentFormData, trackingNumber: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border bg-background"
                                    />
                                </div>
                            </div>

                            {/* Item Selection */}
                            {!editingShipment && (
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Select Items to Ship</label>
                                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                                        {items.map((item) => {
                                            if (!item.id) return null; // Skip items without IDs
                                            const shipped = calculateShippedQuantity(item.id);
                                            const available = item.quantity - shipped;
                                            if (available <= 0) return null;

                                            return (
                                                <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={shipmentFormData.items.some(si => si.orderItemId === item.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setShipmentFormData({
                                                                    ...shipmentFormData,
                                                                    items: [...shipmentFormData.items, { orderItemId: item.id!, quantity: available }]
                                                                });
                                                            } else {
                                                                setShipmentFormData({
                                                                    ...shipmentFormData,
                                                                    items: shipmentFormData.items.filter(si => si.orderItemId !== item.id)
                                                                });
                                                            }
                                                        }}
                                                        className="h-4 w-4"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{item.product?.name || 'Unknown'}</div>
                                                        <div className="text-xs text-muted-foreground">Available: {available}</div>
                                                    </div>
                                                    {shipmentFormData.items.some(si => si.orderItemId === item.id) && (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={available}
                                                            value={shipmentFormData.items.find(si => si.orderItemId === item.id)?.quantity || available}
                                                            onChange={(e) => {
                                                                const qty = parseInt(e.target.value) || 1;
                                                                setShipmentFormData({
                                                                    ...shipmentFormData,
                                                                    items: shipmentFormData.items.map(si =>
                                                                        si.orderItemId === item.id ? { ...si, quantity: Math.min(qty, available) } : si
                                                                    )
                                                                });
                                                            }}
                                                            className="w-20 px-2 py-1 text-sm border rounded"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {shipmentError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                                    {shipmentError}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowShipmentDialog(false);
                                    setEditingShipment(null);
                                    resetShipmentForm();
                                }}
                                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveShipment}
                                disabled={isSavingShipment}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                            >
                                {isSavingShipment ? 'Saving...' : editingShipment ? 'Update Shipment' : 'Create Shipment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notes */}
            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Notes</h2>
                <textarea
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Add notes about this order..."
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
