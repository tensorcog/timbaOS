import prisma from "@/lib/prisma";

export default async function ProductsPage() {
    const products = await prisma.product.findMany({
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
                                    <th className="text-left p-2">Price</th>
                                    <th className="text-left p-2">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id} className="border-b">
                                        <td className="p-2 font-mono text-sm">{product.sku}</td>
                                        <td className="p-2">{product.name}</td>
                                        <td className="p-2">
                                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="p-2">${Number(product.price).toFixed(2)}</td>
                                        <td className="p-2">
                                            <span className={`font-semibold ${product.stockLevel < 10 ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                {product.stockLevel}
                                            </span>
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
