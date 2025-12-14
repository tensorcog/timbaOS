import Link from "next/link";
import { ArrowRight, MapPin, Bot, BarChart3 } from "lucide-react";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-background via-background to-muted/30">
            <div className="max-w-5xl mx-auto text-center space-y-12 animate-fade-in">
                {/* Logo/Title */}
                <div className="space-y-6">
                    <h1 className="text-7xl font-bold tracking-tight bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent drop-shadow-sm">
                        Pine ERP
                    </h1>
                    <p className="text-2xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
                        Modern ERP System for Lumber Yards & Building Material Suppliers
                    </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
                    <div className="glass-card rounded-2xl p-8 text-left hover-lift hover:shadow-warm-lg transition-all group">
                        <MapPin className="h-10 w-10 text-amber-600 mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg font-semibold mb-3">Multi-Location</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Manage multiple stores, warehouses, and distribution centers seamlessly
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-8 text-left hover-lift hover:shadow-warm-lg transition-all group">
                        <Bot className="h-10 w-10 text-orange-600 mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg font-semibold mb-3">AI-Powered</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Autonomous agents monitor inventory and optimize operations intelligently
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-8 text-left hover-lift hover:shadow-warm-lg transition-all group">
                        <BarChart3 className="h-10 w-10 text-amber-700 mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg font-semibold mb-3">Real-Time Insights</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Track inventory, orders, and performance across all locations
                        </p>
                    </div>
                </div>

                {/* CTA */}
                <div className="space-y-6 pt-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 text-white font-semibold hover:from-amber-700 hover:to-orange-800 transition-all shadow-warm-xl hover:shadow-warm-xl hover:scale-105 active:scale-100 text-lg"
                    >
                        Go to Dashboard
                        <ArrowRight className="h-6 w-6" />
                    </Link>

                    <div className="text-sm text-muted-foreground space-y-3">
                        <p className="text-base">🌲 5 Locations • 200 Products • AI StockWatcher Active</p>
                        <p className="text-xs max-w-md mx-auto leading-relaxed">
                            Demo data loaded - Switch locations in the header to see inventory changes
                        </p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="pt-12 border-t border-border/50">
                    <p className="text-sm font-medium text-muted-foreground mb-4">Quick Links</p>
                    <div className="flex gap-6 justify-center text-sm">
                        <Link href="/dashboard/products" className="text-amber-700 hover:text-amber-800 hover:underline transition-colors font-medium">
                            Products
                        </Link>
                        <Link href="/dashboard/orders" className="text-amber-700 hover:text-amber-800 hover:underline transition-colors font-medium">
                            Orders
                        </Link>
                        <Link href="/dashboard/admin" className="text-amber-700 hover:text-amber-800 hover:underline transition-colors font-medium">
                            Admin Panel
                        </Link>
                        <Link href="/dashboard/chat" className="text-amber-700 hover:text-amber-800 hover:underline transition-colors font-medium">
                            AI Chat
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
