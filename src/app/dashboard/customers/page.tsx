import prisma from "@/lib/prisma";

export default async function CustomersPage() {
    const customers = await prisma.customer.findMany({
        include: {
            _count: {
                select: { orders: true },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Customers</h1>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Name</th>
                                    <th className="text-left p-2">Email</th>
                                    <th className="text-left p-2">Phone</th>
                                    <th className="text-left p-2">Orders</th>
                                    <th className="text-left p-2">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((customer) => (
                                    <tr key={customer.id} className="border-b">
                                        <td className="p-2 font-semibold">{customer.name}</td>
                                        <td className="p-2 text-sm text-muted-foreground">{customer.email}</td>
                                        <td className="p-2 text-sm">{customer.phone}</td>
                                        <td className="p-2">{customer._count.orders}</td>
                                        <td className="p-2 text-sm">{new Date(customer.createdAt).toLocaleDateString()}</td>
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
