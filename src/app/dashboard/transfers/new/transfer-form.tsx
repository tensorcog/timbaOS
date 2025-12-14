'use client';

import { useState } from 'react';
import { createTransfer } from '../actions';
import { ArrowRight, Plus, Trash2, Save } from 'lucide-react';

type Location = {
    id: string;
    name: string;
    code: string;
};

type Product = {
    id: string;
    name: string;
    sku: string;
};

interface TransferFormProps {
    locations: Location[];
    products: Product[];
}

export function TransferForm({ locations, products }: TransferFormProps) {
    const [originId, setOriginId] = useState('');
    const [destinationId, setDestinationId] = useState('');
    const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    const addItem = () => {
        if (!selectedProductId || quantity <= 0) return;

        const existingItemIndex = items.findIndex(item => item.productId === selectedProductId);
        if (existingItemIndex >= 0) {
            const newItems = [...items];
            newItems[existingItemIndex].quantity += quantity;
            setItems(newItems);
        } else {
            setItems([...items, { productId: selectedProductId, quantity }]);
        }

        setSelectedProductId('');
        setQuantity(1);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSubmit = async (formData: FormData) => {
        if (items.length === 0) {
            alert('Please add at least one item');
            return;
        }
        if (originId === destinationId) {
            alert('Origin and destination must be different');
            return;
        }

        formData.set('items', JSON.stringify(items));
        await createTransfer(formData);
    };

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Origin Location</label>
                    <select
                        name="originLocationId"
                        value={originId}
                        onChange={(e) => setOriginId(e.target.value)}
                        required
                        className="w-full p-2 rounded-md border bg-background"
                    >
                        <option value="">Select Origin</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.code} - {loc.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Destination Location</label>
                    <select
                        name="destinationLocationId"
                        value={destinationId}
                        onChange={(e) => setDestinationId(e.target.value)}
                        required
                        className="w-full p-2 rounded-md border bg-background"
                    >
                        <option value="">Select Destination</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.code} - {loc.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-sm">Add Items</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Product</label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full p-2 rounded-md border bg-background"
                        >
                            <option value="">Select Product</option>
                            {products.map((prod) => (
                                <option key={prod.id} value={prod.id}>
                                    {prod.sku} - {prod.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-24 space-y-2">
                        <label className="text-sm font-medium">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            className="w-full p-2 rounded-md border bg-background"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={addItem}
                        disabled={!selectedProductId || quantity <= 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>

                {items.length > 0 && (
                    <div className="mt-4 border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-2 text-left">Product</th>
                                    <th className="px-4 py-2 text-right">Quantity</th>
                                    <th className="px-4 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const product = products.find(p => p.id === item.productId);
                                    return (
                                        <tr key={`${item.productId}-${index}`} className="border-t">
                                            <td className="px-4 py-2">
                                                <span className="font-mono text-xs text-muted-foreground mr-2">
                                                    {product?.sku}
                                                </span>
                                                {product?.name}
                                            </td>
                                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                                            <td className="px-4 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                    name="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 rounded-md border bg-background min-h-[100px]"
                    placeholder="Optional notes about this transfer..."
                />
            </div>

            <div className="flex justify-end gap-4">
                <button
                    type="submit"
                    disabled={items.length === 0}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-700 text-white font-semibold rounded-lg hover:from-amber-700 hover:to-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="h-4 w-4" />
                    Create Transfer
                </button>
            </div>
        </form>
    );
}
