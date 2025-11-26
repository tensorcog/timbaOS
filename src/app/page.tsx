import Link from "next/link";
import { ArrowRight, MapPin, Bot, BarChart3 } from "lucide-react";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted">
            <div className="max-w-4xl mx-auto text-center space-y-8">
                {/* Logo/Title */}
                <div className="space-y-4">
                    <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                        Pine ERP
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Modern ERP System for Lumber Yards & Building Material Suppliers
                    </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
                    <div className="rounded-xl border bg-card p-6 text-left">
                        <MapPin className="h-8 w-8 text-purple-400 mb-3" />
                        <h3 className="font-semibold mb-2">Multi-Location</h3>
                        <p className="text-sm text-muted-foreground">
                            Manage multiple stores, warehouses, and distribution centers
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-6 text-left">
                        <Bot className="h-8 w-8 text-blue-400 mb-3" />
                        <h3 className="font-semibold mb-2">AI-Powered</h3>
                        <p className="text-sm text-muted-foreground">
                            Autonomous agents monitor inventory and optimize operations
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-6 text-left">
                        <BarChart3 className="h-8 w-8 text-green-400 mb-3" />
                        <h3 className="font-semibold mb-2">Real-Time Insights</h3>
                        <p className="text-sm text-muted-foreground">
                            Track inventory, orders, and performance across locations
                        </p>
                    </div>
                </div>

                {/* CTA */}
                <div className="space-y-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold hover:from-purple-600 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70"
                    >
                        Go to Dashboard
                        <ArrowRight className="h-5 w-5" />
                    </Link>

                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>🌲 3 Locations • 10 Products • AI StockWatcher Active</p>
                        <p className="text-xs">
                            Demo data loaded - Switch locations in the header to see inventory changes
                        </p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="pt-8 border-t">
                    <p className="text-sm text-muted-foreground mb-4">Quick Links</p>
                    <div className="flex gap-4 justify-center text-sm">
                        <Link href="/dashboard/products" className="text-blue-400 hover:underline">
                            Products
                        </Link>
                        <Link href="/dashboard/orders" className="text-blue-400 hover:underline">
                            Orders
                        </Link>
                        <Link href="/dashboard/admin" className="text-blue-400 hover:underline">
                            Admin Panel
                        </Link>
                        <Link href="/dashboard/admin/import" className="text-blue-400 hover:underline">
                            Import Data
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
