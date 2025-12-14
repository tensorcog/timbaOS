import Link from "next/link";
import { ArrowRight, MapPin, Bot, BarChart3 } from "lucide-react";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-canvas">
            <div className="max-w-5xl mx-auto text-center space-y-12 animate-fade-in">
                {/* Logo/Title */}
                <div className="space-y-6">
                    <h1 className="text-7xl font-display font-bold tracking-tight bg-gradient-to-r from-spruce via-teal to-spruce bg-clip-text text-transparent drop-shadow-sm">
                        TimbaOS
                    </h1>
                    <p className="text-2xl text-foreground/80 max-w-2xl mx-auto leading-relaxed font-display">
                        Digital Arboretum for Modern Lumber Yards
                    </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
                    <div className="bg-card rounded-sanded p-8 text-left hover-lift hover:shadow-float transition-all group border border-border">
                        <MapPin className="h-10 w-10 text-spruce mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg font-display font-semibold mb-3">Multi-Location</h3>
                        <p className="text-sm text-weathered-grey leading-relaxed">
                            Manage multiple stores, warehouses, and distribution centers seamlessly
                        </p>
                    </div>

                    <div className="bg-card rounded-sanded p-8 text-left hover-lift hover:shadow-float transition-all group border border-border">
                        <Bot className="h-10 w-10 text-teal mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg font-display font-semibold mb-3">AI-Powered</h3>
                        <p className="text-sm text-weathered-grey leading-relaxed">
                            Autonomous agents monitor inventory and optimize operations intelligently
                        </p>
                    </div>

                    <div className="bg-card rounded-sanded p-8 text-left hover-lift hover:shadow-float transition-all group border border-border">
                        <BarChart3 className="h-10 w-10 text-gold mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-lg font-display font-semibold mb-3">Real-Time Insights</h3>
                        <p className="text-sm text-weathered-grey leading-relaxed">
                            Track inventory, orders, and performance across all locations
                        </p>
                    </div>
                </div>

                {/* CTA */}
                <div className="space-y-6 pt-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-3 px-10 py-5 rounded-sanded bg-gradient-to-r from-spruce to-teal text-canvas font-semibold hover:from-sp ruce/90 hover:to-teal/90 transition-all shadow-float hover:shadow-warm-xl hover:scale-105 active:scale-100 text-lg font-display"
                    >
                        Go to Dashboard
                        <ArrowRight className="h-6 w-6" />
                    </Link>

                    <div className="text-sm text-weathered-grey space-y-3">
                        <p className="text-base">🌲 5 Locations • 200 Products • AI StockWatcher Active</p>
                        <p className="text-xs max-w-md mx-auto leading-relaxed">
                            Demo data loaded - Switch locations in the header to see inventory changes
                        </p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="pt-12 border-t border-border/50">
                    <p className="text-sm font-medium text-weathered-grey mb-4">Quick Links</p>
                    <div className="flex gap-6 justify-center text-sm">
                        <Link href="/dashboard/products" className="text-spruce hover:text-teal hover:underline transition-colors font-medium">
                            Products
                        </Link>
                        <Link href="/dashboard/orders" className="text-spruce hover:text-teal hover:underline transition-colors font-medium">
                            Orders
                        </Link>
                        <Link href="/dashboard/admin" className="text-spruce hover:text-teal hover:underline transition-colors font-medium">
                            Admin Panel
                        </Link>
                        <Link href="/dashboard/chat" className="text-spruce hover:text-teal hover:underline transition-colors font-medium">
                            AI Chat
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
