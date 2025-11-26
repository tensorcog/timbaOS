import prisma from "@/lib/prisma";

export default async function ProductsPage() {
    const products = await prisma.product.findMany({
        include: {
            inventory: {
                include: {
                    location: true,
                }
            }
        },
        orderBy: {
            category: 'asc',
        },
    });

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Products</h1>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">SKU</th>
                                    <th className="text-left p-2">Name</th>
                                    <th className="text-left p-2">Category</th>
                                    <th className="text-left p-2">Base Price</th>
                                    <th className="text-left p-2">Total Stock</th>
                                    <th className="text-left p-2">Locations</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => {
                                    const totalStock = product.inventory.reduce((sum, inv) => sum + inv.stockLevel, 0);
                                    const minStock = Math.min(...product.inventory.map(inv => inv.stockLevel));

                                    return (
                                        <tr key={product.id} className="border-b">
                                            <td className="p-2 font-mono text-sm">{product.sku}</td>
                                            <td className="p-2">{product.name}</td>
                                            <td className="p-2">
                                                <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="p-2">${Number(product.basePrice).toFixed(2)}</td>
                                            <td className="p-2">
                                                <span className={`font-semibold ${minStock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {totalStock}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex gap-1">
                                                    {product.inventory.map((inv) => (
                                                        <span
                                                            key={inv.id}
                                                            className="text-xs px-1.5 py-0.5 rounded bg-muted"
                                                            title={`${inv.location.name}: ${inv.stockLevel}`}
                                                        >
                                                            {inv.location.code}:{inv.stockLevel}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
