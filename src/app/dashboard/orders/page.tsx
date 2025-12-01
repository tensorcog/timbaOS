import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SearchInput } from "@/components/search-input";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: { q?: string; showAll?: string; sort?: string; order?: string };
}) {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login');
    }

    const userRole = session.user.role as UserRole;
    const userLocationIds = session.user.locationIds || [];

    const query = searchParams.q;
    const showAll = searchParams.showAll === 'true';
    const sort = searchParams.sort || 'createdAt';
    const sortOrder = searchParams.order === 'asc' ? 'asc' : 'desc';

    // Build location filter based on role and selected location
    const cookieStore = cookies();
    const selectedLocationId = cookieStore.get('locationId')?.value;

    let locationFilter: any = {};

    // If showAll is enabled, show all locations (no filter)
    if (showAll) {
        locationFilter = {};
    } else if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN) {
        // Admins can see all, but if they selected a location, filter by it
        if (selectedLocationId) {
            locationFilter = { locationId: selectedLocationId };
        }
    } else {
        // Regular users are restricted to their assigned locations
        if (selectedLocationId && userLocationIds.includes(selectedLocationId)) {
            locationFilter = { locationId: selectedLocationId };
        } else {
            // Fallback to all assigned locations if no selection or invalid selection
            locationFilter = { locationId: { in: userLocationIds } };
        }
    }

    // Sales users only see their own orders
    const ownershipFilter = userRole === UserRole.SALES
        ? { salesRepId: session.user.id }
        : {};

    // Determine orderBy based on sort param
    let orderBy: any = {};
    switch (sort) {
        case 'orderNumber':
            orderBy = { orderNumber: sortOrder };
            break;
        case 'customer':
            orderBy = { Customer: { name: sortOrder } };
            break;
        case 'status':
            orderBy = { status: sortOrder };
            break;
        case 'totalAmount':
            orderBy = { totalAmount: sortOrder };
            break;
        case 'createdAt':
        default:
            orderBy = { createdAt: sortOrder };
            break;
    }

    const orders = await prisma.order.findMany({
        where: {
            ...locationFilter,
            ...ownershipFilter,
            ...(query
                ? {
                    OR: [
                        { orderNumber: { contains: query, mode: "insensitive" } },
                        { Customer: { name: { contains: query, mode: "insensitive" } } },
                    ],
                }
                : {}),
        },
        include: {
            Customer: true,
            OrderItem: {
                include: {
                    Product: true,
                },
            },
        },
        orderBy,
    });

    // Helper to generate sort URL
    const getSortUrl = (column: string) => {
        const newOrder = sort === column && sortOrder === 'asc' ? 'desc' : 'asc';
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (showAll) params.set('showAll', 'true');
        params.set('sort', column);
        params.set('order', newOrder);
        return `/dashboard/orders?${params.toString()}`;
    };

    // Sort Header Component
    const SortHeader = ({ column, label }: { column: string; label: string }) => {
        const isActive = sort === column;
        return (
            <th className="text-left p-2">
                <Link href={getSortUrl(column)} className="flex items-center gap-1 hover:text-primary transition-colors group">
                    {label}
                    {isActive ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                    )}
                </Link>
            </th>
        );
    };

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold md:text-2xl">Orders</h1>
                <Link
                    href={showAll ? "/dashboard/orders" : "/dashboard/orders?showAll=true"}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        showAll
                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 text-primary'
                            : 'bg-background hover:bg-muted'
                    }`}
                >
                    {showAll ? '✓ All Locations' : 'Show All Locations'}
                </Link>
            </div>
            {/* Search Bar */}
            <div className="mb-4">
                <SearchInput 
                    placeholder="Search orders by number or customer..."
                    baseUrl="/dashboard/orders"
                />
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <SortHeader column="orderNumber" label="Order Number" />
                                    <SortHeader column="customer" label="Customer" />
                                    <SortHeader column="status" label="Status" />
                                    <SortHeader column="totalAmount" label="Total" />
                                    <SortHeader column="createdAt" label="Date" />
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors">
                                        <td className="p-2">
                                            <Link href={`/dashboard/orders/${order.id}`} className="font-mono text-sm hover:text-primary">
                                                {order.orderNumber}
                                            </Link>
                                        </td>
                                        <td className="p-2">
                                            <Link href={`/dashboard/orders/${order.id}`} className="hover:text-primary">
                                                {order.Customer.name}
                                            </Link>
                                        </td>
                                        <td className="p-2">
                                            <Link href={`/dashboard/orders/${order.id}`} className="block">
                                                <span className={`px-2 py-1 rounded text-xs ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="p-2">
                                            <Link href={`/dashboard/orders/${order.id}`} className="hover:text-primary">
                                                ${order.totalAmount.toString()}
                                            </Link>
                                        </td>
                                        <td className="p-2">
                                            <Link href={`/dashboard/orders/${order.id}`} className="hover:text-primary">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
