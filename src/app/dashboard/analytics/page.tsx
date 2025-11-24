import prisma from "@/lib/prisma";

export default async function AnalyticsPage() {
    const orders = await prisma.order.findMany({
        include: {
            items: {
                include: {
                    product: true,
                },
            },
        },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

    // Top selling products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

    orders.forEach(order => {
        order.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    name: item.product.name,
                    quantity: 0,
                    revenue: 0,
                };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += Number(item.price) * item.quantity;
        });
    });

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Analytics</h1>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
                    <div className="text-3xl font-bold mt-2">${totalRevenue.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Completed Orders</div>
                    <div className="text-3xl font-bold mt-2">{completedOrders}</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <div className="text-sm font-medium text-muted-foreground">Pending Orders</div>
                    <div className="text-3xl font-bold mt-2">{pendingOrders}</div>
                </div>
            </div>

            {/* Top Products */}
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <h3 className="font-semibold mb-4">Top Selling Products</h3>
                    <div className="space-y-4">
                        {topProducts.map((product, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {product.quantity} units sold
                                    </div>
                                </div>
                                <div className="text-lg font-semibold">
                                    ${product.revenue.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <h3 className="font-semibold mb-4">Order Status Distribution</h3>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Completed</span>
                                <span className="text-sm font-medium">{completedOrders}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${(completedOrders / orders.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Pending</span>
                                <span className="text-sm font-medium">{pendingOrders}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-yellow-500 h-2 rounded-full"
                                    style={{ width: `${(pendingOrders / orders.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
