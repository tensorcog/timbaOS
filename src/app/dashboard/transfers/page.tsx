import prisma from "@/lib/prisma";
import { ArrowRight, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { TransferActions } from "./transfer-actions";

export default async function TransfersPage() {
    const transfers = await prisma.inventoryTransfer.findMany({
        include: {
            Location_InventoryTransfer_originLocationIdToLocation: true,
            Location_InventoryTransfer_destinationLocationIdToLocation: true,
            TransferItem: {
                include: {
                    Product: true,
                },
            },
            User_InventoryTransfer_requestedByIdToUser: true,
            User_InventoryTransfer_approvedByIdToUser: true,
        },
        orderBy: {
            requestedAt: 'desc',
        },
    });

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

            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <div className="space-y-4">
                        {transfers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <ArrowRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No transfers found</p>
                            </div>
                        ) : (
                            transfers.map((transfer) => (
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
                                            <TransferActions transferId={transfer.id} status={transfer.status} />
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
