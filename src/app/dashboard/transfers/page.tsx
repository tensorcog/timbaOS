"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Clock, CheckCircle, XCircle, Filter } from "lucide-react";
import Link from "next/link";
import { TransferActions } from "./transfer-actions";
import { useSearchParams, useRouter } from "next/navigation";

interface Transfer {
    id: string;
    transferNumber: string;
    status: string;
    requestedAt: string;
    receivedAt: string | null;
    notes: string | null;
    Location_InventoryTransfer_originLocationIdToLocation: {
        code: string;
        name: string;
    };
    Location_InventoryTransfer_destinationLocationIdToLocation: {
        code: string;
        name: string;
    };
    TransferItem: Array<{
        id: string;
        requestedQty: number;
        Product: {
            sku: string;
            name: string;
        };
    }>;
    User_InventoryTransfer_requestedByIdToUser: {
        name: string;
    } | null;
}

const STATUSES = ['PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;

export default function TransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();
    const router = useRouter();

    // Get selected statuses from URL params
    const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
        const params = searchParams.get('statuses');
        if (params) {
            return new Set(params.split(','));
        }
        return new Set(STATUSES); // All selected by default
    });

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/transfers');
            if (res.ok) {
                const data = await res.json();
                setTransfers(data.transfers || []);
            }
        } catch (error) {
            console.error('Error fetching transfers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusToggle = (status: string) => {
        const newStatuses = new Set(selectedStatuses);
        if (newStatuses.has(status)) {
            newStatuses.delete(status);
        } else {
            newStatuses.add(status);
        }
        setSelectedStatuses(newStatuses);

        // Update URL params
        const params = new URLSearchParams();
        if (newStatuses.size > 0 && newStatuses.size < STATUSES.length) {
            params.set('statuses', Array.from(newStatuses).join(','));
        }
        router.push(`/dashboard/transfers${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const filteredTransfers = transfers.filter(transfer =>
        selectedStatuses.has(transfer.status)
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'APPROVED':
                return 'bg-blue-500/20 text-blue-400';
            case 'IN_TRANSIT':
                return 'bg-purple-500/20 text-purple-400';
            case 'RECEIVED':
                return 'bg-green-500/20 text-green-400';
            case 'CANCELLED':
                return 'bg-red-500/20 text-red-400';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Clock className="h-4 w-4" />;
            case 'RECEIVED':
                return <CheckCircle className="h-4 w-4" />;
            case 'CANCELLED':
                return <XCircle className="h-4 w-4" />;
            default:
                return <ArrowRight className="h-4 w-4" />;
        }
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Inventory Transfers</h1>
                <Link href="/dashboard/transfers/new">
                    <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold hover:from-purple-600 hover:to-blue-700 transition-all">
                        New Transfer
                    </button>
                </Link>
            </div>

            {/* Status Filters */}
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filter by Status:</span>
                </div>
                <div className="flex flex-wrap gap-3">
                    {STATUSES.map((status) => (
                        <label key={status} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedStatuses.has(status)}
                                onChange={() => handleStatusToggle(status)}
                                className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            />
                            <span className={`text-sm px-2 py-1 rounded ${getStatusColor(status)}`}>
                                {status}
                            </span>
                        </label>
                    ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                    Showing {filteredTransfers.length} of {transfers.length} transfers
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground">
                                Loading transfers...
                            </div>
                        ) : filteredTransfers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <ArrowRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No transfers found</p>
                            </div>
                        ) : (
                            filteredTransfers.map((transfer) => (
                                <div
                                    key={transfer.id}
                                    className="rounded-lg border bg-muted/50 p-4 hover:bg-muted transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 font-semibold text-sm">
                                                    {transfer.Location_InventoryTransfer_originLocationIdToLocation.code}
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                <div className="px-3 py-1 rounded bg-purple-500/20 text-purple-400 font-semibold text-sm">
                                                    {transfer.Location_InventoryTransfer_destinationLocationIdToLocation.code}
                                                </div>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {transfer.Location_InventoryTransfer_originLocationIdToLocation.name} → {transfer.Location_InventoryTransfer_destinationLocationIdToLocation.name}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium ${getStatusColor(transfer.status)}`}>
                                                {getStatusIcon(transfer.status)}
                                                {transfer.status}
                                            </div>
                                            <TransferActions 
                                                transferId={transfer.id} 
                                                status={transfer.status}
                                                onUpdate={fetchTransfers}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        {transfer.TransferItem.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between text-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {item.Product.sku}
                                                    </span>
                                                    <span>{item.Product.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold">
                                                        {item.requestedQty} units
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                                        <div>
                                            Requested by <span className="font-medium">{transfer.User_InventoryTransfer_requestedByIdToUser?.name || 'System'}</span>
                                            {' on '}{new Date(transfer.requestedAt).toLocaleDateString()}
                                        </div>
                                        {transfer.receivedAt && (
                                            <div>
                                                Received on {new Date(transfer.receivedAt).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>

                                    {transfer.notes && (
                                        <div className="mt-2 text-sm text-muted-foreground italic">
                                            "{transfer.notes}"
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
