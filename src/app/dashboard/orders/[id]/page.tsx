import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Package, User, Calendar, DollarSign } from "lucide-react";
import { notFound } from "next/navigation";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
    const order = await prisma.order.findUnique({
        where: { id: params.id },
        include: {
            customer: true,
            items: {
                include: {
                    product: true,
                },
            },
        },
    });

    if (!order) {
        notFound();
    }

    return (
        <>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/orders"
                    className="h-10 w-10 rounded-lg border bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Order Details</h1>
                    <p className="text-sm text-muted-foreground">Order ID: {order.id.slice(0, 8)}</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Customer</p>
                            <p className="font-semibold">{order.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Order Date</p>
                            <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'COMPLETED'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {order.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="text-2xl font-bold">${order.totalAmount.toString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border bg-card">
                <div className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Order Items</h3>
                    <div className="space-y-3">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <Package className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{item.product.name}</p>
                                        <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">${item.price.toString()} × {item.quantity}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Total: ${(Number(item.price) * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
