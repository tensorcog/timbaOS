'use client';

import { useState } from 'react';
import { Search, User, Plus, X } from 'lucide-react';

interface Customer {
    id: string;
    name: string;
    email: string;
    taxExempt: boolean;
}

interface CustomerLookupProps {
    customer: Customer | null;
    onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerLookup({ customer, onSelectCustomer }: CustomerLookupProps) {
    const [isSearching, setIsSearching] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Customer[]>([]);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });

    const searchCustomers = async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        try {
            const response = await fetch(`/api/pos/customers?q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error('Failed to search customers:', error);
        }
    };

    const handleSearch = (value: string) => {
        setQuery(value);
        const debounce = setTimeout(() => searchCustomers(value), 300);
        return () => clearTimeout(debounce);
    };

    const createWalkInCustomer = async () => {
        try {
            const response = await fetch('/api/pos/customers/walk-in', {
                method: 'POST',
            });
            const data = await response.json();
            onSelectCustomer(data);
            setIsSearching(false);
        } catch (error) {
            console.error('Failed to create walk-in customer:', error);
        }
    };

    const createNewCustomer = async () => {
        try {
            const response = await fetch('/api/pos/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer),
            });
            const data = await response.json();
            onSelectCustomer(data);
            setShowNewCustomerForm(false);
            setIsSearching(false);
            setNewCustomer({ name: '', email: '', phone: '' });
        } catch (error) {
            console.error('Failed to create customer:', error);
        }
    };

    if (customer && !isSearching) {
        return (
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                            {customer.taxExempt && (
                                <div className="text-xs text-green-600 font-medium">Tax Exempt</div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            onSelectCustomer(null);
                            setIsSearching(true);
                        }}
                        className="text-muted-foreground hover:text-foreground p-1"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    if (showNewCustomerForm) {
        return (
            <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-4">New Customer</h3>
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Name *"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        className="w-full px-3 py-2 rounded border bg-background"
                    />
                    <input
                        type="email"
                        placeholder="Email *"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="w-full px-3 py-2 rounded border bg-background"
                    />
                    <input
                        type="tel"
                        placeholder="Phone"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded border bg-background"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={createNewCustomer}
                            disabled={!newCustomer.name || !newCustomer.email}
                            className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setShowNewCustomerForm(false)}
                            className="px-4 py-2 rounded border hover:bg-muted"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold mb-3">Customer</h3>

            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => setIsSearching(true)}
                    className="w-full pl-9 pr-3 py-2 rounded border bg-background text-sm"
                />
            </div>

            {results.length > 0 && (
                <div className="mb-3 max-h-40 overflow-auto space-y-1">
                    {results.map((result) => (
                        <button
                            key={result.id}
                            onClick={() => {
                                onSelectCustomer(result);
                                setIsSearching(false);
                                setQuery('');
                                setResults([]);
                            }}
                            className="w-full text-left p-2 rounded hover:bg-muted text-sm"
                        >
                            <div className="font-medium">{result.name}</div>
                            <div className="text-xs text-muted-foreground">{result.email}</div>
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={createWalkInCustomer}
                    className="flex-1 py-2 rounded border hover:bg-muted text-sm"
                >
                    Walk-in
                </button>
                <button
                    onClick={() => setShowNewCustomerForm(true)}
                    className="flex-1 py-2 rounded border hover:bg-muted text-sm flex items-center justify-center gap-1"
                >
                    <Plus className="h-4 w-4" />
                    New
                </button>
            </div>
        </div>
    );
}
