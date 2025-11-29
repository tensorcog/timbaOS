import prisma from "@/lib/prisma";
import { SearchInput } from "@/components/search-input";

export default async function CustomersPage({
    searchParams,
}: {
    searchParams: { q?: string };
}) {
    const query = searchParams.q;

    const customers = await prisma.customer.findMany({
        where: query
            ? {
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query, mode: "insensitive" } },
                ],
            }
            : {},
        include: {
            _count: {
                select: { Order: true },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <>
            <div className="flex items-center mb-4">
                <h1 className="text-lg font-semibold md:text-2xl">Customers</h1>
            </div>
            {/* Search Bar */}
            <div className="mb-4">
                <SearchInput 
                    placeholder="Search customers by name, email, or phone..."
                    baseUrl="/dashboard/customers"
                />
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
                                        <td className="p-2">{customer._count.Order}</td>
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
