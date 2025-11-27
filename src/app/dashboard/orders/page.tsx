import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: { q?: string };
}) {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login');
    }

    const userRole = session.user.role as UserRole;
    const userLocationIds = session.user.locationIds || [];

    const query = searchParams.q;

    // Build location filter
    const locationFilter = (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.LOCATION_ADMIN)
        ? {} // Admins see all
        : { locationId: { in: userLocationIds } };

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
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Orders</h1>
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
