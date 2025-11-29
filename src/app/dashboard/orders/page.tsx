import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SearchInput } from "@/components/search-input";

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: { q?: string; showAll?: string };
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
        orderBy: {
            createdAt: "desc",
        },
    });

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
                                    <th className="text-left p-2">Order Number</th>
                                    <th className="text-left p-2">Customer</th>
                                    <th className="text-left p-2">Status</th>
                                    <th className="text-left p-2">Total</th>
                                    <th className="text-left p-2">Date</th>
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
