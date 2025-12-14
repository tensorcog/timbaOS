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
                <div className="col-span-4 rounded-organic-2 texture-paper bg-card border-2 border-walnut-medium/20 shadow-organic">
                    <div className="p-6">
                        <h3 className="font-display font-bold text-2xl mb-1 text-mahogany-deep">Recent Orders</h3>
                        <p className="text-sm text-walnut-medium mb-6">
                            Latest transactions from your customers
                        </p>
                        <div className="space-y-3">
                            {orders.map((order) => (
                                <Link
                                    key={order.id}
                                    href={`/dashboard/orders/${order.id}`}
                                    className="flex items-center justify-between p-4 rounded-organic-2 bg-white/60 hover:bg-white border border-walnut-medium/10 hover:border-brass/30 transition-all hover:shadow-organic cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-organic-2 bg-gradient-to-br from-mahogany-deep to-cherry-warm flex items-center justify-center text-white font-bold text-lg shadow-organic">
                                            {order.Customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-mahogany-deep">{order.Customer.name}</p>
                                            <p className="text-sm text-walnut-medium">
                                                {order.OrderItem.length} items • {new Date(order.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-mahogany-deep">${order.totalAmount.toString()}</p>
                                        <span className={`text-xs px-3 py-1 rounded-organic-2 font-medium ${order.status === 'COMPLETED'
                                            ? 'bg-maple-golden/30 text-mahogany-deep border border-maple-golden'
                                            : 'bg-brass/20 text-walnut-deep border border-brass/40'
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
                <div className="col-span-4 rounded-organic-2 texture-paper bg-card border-2 border-walnut-medium/20 shadow-organic">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-display font-bold text-2xl mb-1 text-mahogany-deep">Recent Quotes</h3>
                                <p className="text-sm text-walnut-medium">
                                    Latest quotes generated
                                </p>
                            </div>
                            <Link href="/dashboard/quotes" className="text-sm text-brass font-semibold hover:text-brass-bright hover:underline transition-colors">
                                View all
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {quotes.map((quote) => (
                                <Link
                                    key={quote.id}
                                    href={`/dashboard/quotes/${quote.id}`}
                                    className="flex items-center justify-between p-4 rounded-organic-2 bg-white/60 hover:bg-white border border-walnut-medium/10 hover:border-brass/30 transition-all hover:shadow-organic cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-organic-2 texture-brass flex items-center justify-center text-char font-bold text-lg shadow-organic">
                                            {quote.Customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-mahogany-deep">{quote.Customer.name}</p>
                                            <p className="text-sm text-walnut-medium">
                                                {quote.quoteNumber} • {quote.QuoteItem.length} items
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-mahogany-deep">${Number(quote.totalAmount).toFixed(2)}</p>
                                        <span className={`text-xs px-3 py-1 rounded-organic-2 font-medium ${quote.status === 'ACCEPTED'
                                            ? 'bg-maple-golden/30 text-mahogany-deep border border-maple-golden'
                                            : quote.status === 'REJECTED' || quote.status === 'EXPIRED'
                                                ? 'bg-cherry-warm/20 text-cherry-bright border border-cherry-warm/60'
                                                : 'bg-brass/20 text-walnut-deep border border-brass/40'
                                            }`}>
                                            {quote.status}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                            {quotes.length === 0 && (
                                <p className="text-sm text-walnut-medium text-center py-6">
                                    No quotes generated yet.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockCount > 0 && (
                <div className="rounded-organic-2 texture-paper bg-card border-2 border-cherry-warm/40 shadow-organic p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-organic-2 bg-cherry-warm/20 flex items-center justify-center border-2 border-cherry-warm/50 flex-shrink-0">
                            <AlertCircle className="h-6 w-6 text-cherry-bright" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-display font-bold text-xl text-cherry-bright">Low Stock Alert</h3>
                            <p className="text-sm text-walnut-medium mt-1">
                                {lowStockCount} item{lowStockCount > 1 ? 's' : ''} running low on inventory across all locations
                            </p>
                            <div className="mt-4 space-y-3">
                                {lowStockItems.slice(0, 3).map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-organic-2 bg-white/60 border border-cherry-warm/20">
                                        <div className="flex-1">
                                            <span className="font-semibold text-mahogany-deep">{item.Product.name}</span>
                                            <span className="text-xs text-walnut-medium ml-2">@ {item.Location.name}</span>
                                        </div>
                                        <span className="font-bold text-cherry-bright">{item.stockLevel} left</span>
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
