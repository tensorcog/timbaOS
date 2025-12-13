"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";

interface TransferUpdateDialogProps {
    transferId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Transfer {
    id: string;
    transferNumber: string;
    notes: string | null;
    status: string;
    Location_InventoryTransfer_originLocationIdToLocation: {
        name: string;
    };
    Location_InventoryTransfer_destinationLocationIdToLocation: {
        name: string;
    };
    TransferItem: Array<{
        id: string;
        requestedQty: number;
        Product: {
            name: string;
            sku: string;
        };
    }>;
}

export function TransferUpdateDialog({
    transferId,
    isOpen,
    onClose,
    onSuccess,
}: TransferUpdateDialogProps) {
    const [transfer, setTransfer] = useState<Transfer | null>(null);
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && transferId) {
            fetchTransfer();
        }
    }, [isOpen, transferId]);

    const fetchTransfer = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/transfers/${transferId}`);
            if (res.ok) {
                const data = await res.json();
                setTransfer(data.transfer);
                setNotes(data.transfer.notes || "");
            } else {
                toast.error("Failed to load transfer");
            }
        } catch (error) {
            toast.error("Error loading transfer");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const res = await fetch(`/api/transfers/${transferId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes }),
            });

            if (res.ok) {
                toast.success("Transfer updated successfully");
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update transfer");
            }
        } catch (error) {
            toast.error("Error updating transfer");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-card text-card-foreground rounded-xl border shadow-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Edit Transfer</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Loading transfer details...
                    </div>
                ) : transfer ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Transfer Info (Read-only) */}
                        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Transfer Number:</span>
                                <span className="font-mono font-semibold">{transfer.transferNumber}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Route:</span>
                                <span className="font-medium">
                                    {transfer.Location_InventoryTransfer_originLocationIdToLocation.name} →{" "}
                                    {transfer.Location_InventoryTransfer_destinationLocationIdToLocation.name}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-sm font-medium">
                                    {transfer.status}
                                </span>
                            </div>
                        </div>

                        {/* Items List (Read-only) */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Items</label>
                            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                {transfer.TransferItem.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {item.Product.sku}
                                            </span>
                                            <span>{item.Product.name}</span>
                                        </div>
                                        <span className="font-semibold">{item.requestedQty} units</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Editable Notes */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes about this transfer..."
                                className="w-full min-h-[100px] px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-8 text-red-500">
                        Failed to load transfer
                    </div>
                )}
            </div>
        </div>
    );
}
