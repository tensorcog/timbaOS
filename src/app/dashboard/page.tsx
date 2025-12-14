import prisma from "@/lib/prisma";
import { TrendingUp, Package, Users, DollarSign, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login');
    }

    const userRole = session.user.role as UserRole;
    const userLocationIds = session.user.locationIds || [];

    // Build location filter based on role and selected location
    const cookieStore = cookies();
    const selectedLocationId = cookieStore.get('locationId')?.value;

    let locationFilter: any = {};

    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN) {
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

    // Sales users only see their own quotes and orders
    const ownershipFilter = userRole === UserRole.SALES
        ? { createdById: session.user.id }
        : {};

    const [orders, lowStockItems, customers, quotes] = await Promise.all([
        prisma.order.findMany({
            where: {
                ...locationFilter,
                ...(userRole === UserRole.SALES ? { salesRepId: session.user.id } : {}),
            },
            include: {
                Customer: true,
                OrderItem: {
                    select: {
                        id: true,
                        quantity: true,
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
        prisma.locationInventory.findMany({
            where: {
                stockLevel: { lt: 10 },
                ...(userLocationIds.length > 0 ? { locationId: { in: userLocationIds } } : {}),
            },
            include: {
                Product: true,
                Location: true,
            },
            take: 10,
        }),
        prisma.customer.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.quote.findMany({
            where: {
                ...locationFilter,
                ...ownershipFilter,
            },
            include: {
                Customer: true,
                QuoteItem: {
                    select: {
                        id: true,
                        quantity: true,
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        })
    ]);

    const totalRevenue = await prisma.order.aggregate({
        where: locationFilter,
        _sum: { totalAmount: true }
    });

    const totalOrders = await prisma.order.count({
        where: locationFilter,
    });
    const totalCustomers = await prisma.customer.count();
    const lowStockCount = lowStockItems.length;

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-mahogany-deep via-cherry-warm to-brass bg-clip-text text-transparent">
                        Dashboard
                    </h1>
                    <p className="text-walnut-medium mt-2 text-lg">Welcome back to TimbaOS</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="relative overflow-hidden rounded-organic-2 texture-paper bg-card p-6 border-2 border-walnut-medium/20 shadow-organic">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-walnut-medium uppercase tracking-wider">Total Revenue</p>
                            <h3 className="text-3xl font-display font-bold mt-2 text-mahogany-deep">
                                ${(totalRevenue._sum.totalAmount || 0).toString()}
                            </h3>
                            <p className="text-xs text-cherry-bright mt-2 flex items-center gap-1 font-medium">
                                <TrendingUp className="h-3 w-3" />
                                +20.1% from last month
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-organic-2 texture-brass flex items-center justify-center shadow-organic">
                            <DollarSign className="h-7 w-7 text-char" />
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-organic-2 texture-paper bg-card p-6 border-2 border-walnut-medium/20 shadow-organic">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-walnut-medium uppercase tracking-wider">Total Orders</p>
                            <h3 className="text-3xl font-display font-bold mt-2 text-mahogany-deep">{totalOrders}</h3>
                            <p className="text-xs text-cherry-bright mt-2 flex items-center gap-1 font-medium">
                                <TrendingUp className="h-3 w-3" />
                                +12.5% from last month
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-organic-2 bg-gradient-to-br from-cherry-warm to-cherry-bright flex items-center justify-center shadow-organic">
                            <Package className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-organic-2 texture-paper bg-card p-6 border-2 border-walnut-medium/20 shadow-organic">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-walnut-medium uppercase tracking-wider">Total Customers</p>
                            <h3 className="text-3xl font-display font-bold mt-2 text-mahogany-deep">{totalCustomers}</h3>
                            <p className="text-xs text-cherry-bright mt-2 flex items-center gap-1 font-medium">
                                <TrendingUp className="h-3 w-3" />
                                +8.2% from last month
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-organic-2 bg-gradient-to-br from-maple-golden to-brass-bright flex items-center justify-center shadow-organic">
                            <Users className="h-7 w-7 text-char" />
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-organic-2 texture-paper bg-card p-6 border-2 border-cherry-warm/30 shadow-organic">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-walnut-medium uppercase tracking-wider">Low Stock Items</p>
                            <h3 className="text-3xl font-display font-bold mt-2 text-cherry-bright">{lowStockCount}</h3>
                            <p className="text-xs text-cherry-warm mt-2 flex items-center gap-1 font-medium">
                                <AlertCircle className="h-3 w-3" />
                                Needs attention
                            </p>
                        </div>
                        <div className="h-14 w-14 rounded-organic-2 bg-cherry-warm/20 flex items-center justify-center border-2 border-cherry-warm/40">
                            <AlertCircle className="h-7 w-7 text-cherry-bright" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Orders */}
                <div className="col-span-4 rounded-xl border bg-card/50 backdrop-blur">
                    <div className="p-6">
                        <h3 className="font-semibold text-lg mb-1">Recent Orders</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Latest transactions from your customers
                        </p>
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <Link
                                    key={order.id}
                                    href={`/dashboard/orders/${order.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                            {order.Customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium">{order.Customer.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.OrderItem.length} items • {new Date(order.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">${order.totalAmount.toString()}</p>
                                        <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'COMPLETED'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Quotes */}
                <div className="col-span-4 rounded-xl border bg-card/50 backdrop-blur">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Recent Quotes</h3>
                                <p className="text-sm text-muted-foreground">
                                    Latest quotes generated
                                </p>
                            </div>
                            <Link href="/dashboard/quotes" className="text-sm text-blue-500 hover:underline">
                                View all
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {quotes.map((quote) => (
                                <Link
                                    key={quote.id}
                                    href={`/dashboard/quotes/${quote.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-600 to-red-600 flex items-center justify-center text-white font-semibold">
                                            {quote.Customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium">{quote.Customer.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {quote.quoteNumber} • {quote.QuoteItem.length} items
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">${Number(quote.totalAmount).toFixed(2)}</p>
                                        <span className={`text-xs px-2 py-1 rounded-full ${quote.status === 'ACCEPTED'
                                            ? 'bg-green-500/20 text-green-400'
                                            : quote.status === 'REJECTED' || quote.status === 'EXPIRED'
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {quote.status}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                            {quotes.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No quotes generated yet.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockCount > 0 && (
                <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-400">Low Stock Alert</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {lowStockCount} item{lowStockCount > 1 ? 's' : ''} running low on inventory across all locations
                            </p>
                            <div className="mt-3 space-y-2">
                                {lowStockItems.slice(0, 3).map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                        <div className="flex-1">
                                            <span className="font-medium">{item.Product.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">@ {item.Location.name}</span>
                                        </div>
                                        <span className="font-semibold text-red-400">{item.stockLevel} left</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
