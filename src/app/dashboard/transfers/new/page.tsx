import prisma from "@/lib/prisma";
import { TransferForm } from "./transfer-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewTransferPage() {
    const locations = await prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { code: 'asc' },
    });

    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/transfers"
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-semibold">New Inventory Transfer</h1>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <TransferForm locations={locations} products={products} />
                </div>
            </div>
        </div>
    );
}
