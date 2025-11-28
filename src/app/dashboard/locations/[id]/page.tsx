import prisma from "@/lib/prisma";
import { MapPin, Phone, User, Building, ArrowLeft, Package, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface LocationDetailsPageProps {
    params: {
        id: string;
    };
}

export default async function LocationDetailsPage({ params }: LocationDetailsPageProps) {
    const location = await prisma.location.findUnique({
        where: { id: params.id },
        include: {
            User: {
                select: {
                    name: true,
                    email: true,
                }
            },
            LocationInventory: {
                include: {
                    Product: true,
                },
                orderBy: {
                    stockLevel: 'desc',
                },
                take: 10,
            },
            UserLocation: {
                include: {
                    User: {
                        select: {
                            name: true,
                            email: true,
                            role: true,
                        }
                    }
                }
            },
        },
    });

    if (!location) {
        notFound();
    }

    // Calculate total inventory value
    const totalInventoryValue = location.LocationInventory.reduce((sum: number, item: any) => {
        return sum + (item.stockLevel * parseFloat(item.Product.basePrice.toString()));
    }, 0);

    // Count total products
    const totalProducts = location.LocationInventory.length;

    // Count low stock items
    const lowStockItems = location.LocationInventory.filter((item: any) => item.stockLevel < 10).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/locations"
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        {location.name}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Location details and inventory overview
                    </p>
                </div>
                <Link
                    href={`/dashboard/analytics?locationId=${location.id}`}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                </Link>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${location.isWarehouse
                    ? "bg-purple-500/10 text-purple-500"
                    : "bg-blue-500/10 text-blue-500"
                    }`}>
                    {location.isWarehouse ? "Warehouse" : "Store"}
                </span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${location.isActive
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                    }`}>
                    {location.isActive ? "● Active" : "● Inactive"}
                </span>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Package className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                            <p className="text-2xl font-bold">{totalProducts}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Inventory Value</p>
                            <p className="text-2xl font-bold">${totalInventoryValue.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <Package className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                            <p className="text-2xl font-bold">{lowStockItems}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location Information */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Contact Information */}
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Location Information
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Code</p>
                            <p className="font-mono font-medium">{location.code}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Address</p>
                            <p className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <span>{location.address}</span>
                            </p>
                        </div>
                        {location.phone && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Phone</p>
                                <p className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>{location.phone}</span>
                                </p>
                            </div>
                        )}
                        {location.User && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Manager</p>
                                <p className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>{location.User.name}</span>
                                </p>
                                <p className="text-sm text-muted-foreground ml-6">{location.User.email}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Tax Rate</p>
                            <p className="font-medium">{(parseFloat(location.taxRate.toString()) * 100).toFixed(2)}%</p>
                        </div>
                    </div>
                </div>

                {/* Assigned Staff */}
                <div className="rounded-xl border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assigned Staff
                    </h2>
                    {location.UserLocation.length > 0 ? (
                        <div className="space-y-3">
                            {location.UserLocation.map((ul) => (
                                <div key={ul.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                    <div>
                                        <p className="font-medium">{ul.User.name}</p>
                                        <p className="text-sm text-muted-foreground">{ul.User.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {ul.User.role.replace(/_/g, ' ')}
                                        </p>
                                        {ul.canManage && (
                                            <p className="text-xs text-green-600 font-medium">Manager</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No staff assigned to this location</p>
                    )}
                </div>
            </div>

            {/* Top Inventory Items */}
            <div className="rounded-xl border bg-card">
                <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Top Inventory Items
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-border bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-medium text-sm">SKU</th>
                                <th className="text-left p-4 font-medium text-sm">Product</th>
                                <th className="text-left p-4 font-medium text-sm">Category</th>
                                <th className="text-right p-4 font-medium text-sm">Quantity</th>
                                <th className="text-right p-4 font-medium text-sm">Unit Price</th>
                                <th className="text-right p-4 font-medium text-sm">Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {location.LocationInventory.slice(0, 10).map((item) => (
                                <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                    <td className="p-4 font-mono text-sm text-muted-foreground">
                                        {item.Product.sku}
                                    </td>
                                    <td className="p-4 font-medium">{item.Product.name}</td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                        {item.Product.category}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`font-medium ${item.stockLevel < 10 ? 'text-red-500' : 'text-foreground'
                                            }`}>
                                            {item.stockLevel}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right text-sm">
                                        ${parseFloat(item.Product.basePrice.toString()).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right font-medium">
                                        ${(item.stockLevel * parseFloat(item.Product.basePrice.toString())).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {location.LocationInventory.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">
                        No inventory items at this location
                    </div>
                )}
            </div>
        </div>
    );
}
