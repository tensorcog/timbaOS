import Link from "next/link";
import { ArrowRight, MapPin, Bot, BarChart3 } from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen gradient-organic flex items-center justify-center p-8 relative overflow-hidden">
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Hero Section */}
                <div className="text-center space-y-8 mb-16 animate-fade-in">
                    <div className="inline-block px-6 py-3 bg-mahogany-deep/80 backdrop-blur-sm border-2 border-brass/40 rounded-organic-2 shadow-organic">
                        <span className="text-brass-bright font-mono text-sm font-bold tracking-widest">DIGITAL SAWMILL WORKSHOP</span>
                    </div>
                    
                    <h1 className="text-8xl font-display font-black tracking-tight leading-none mb-4">
                        <span className="bg-gradient-to-br from-mahogany-deep via-cherry-warm to-cherry-bright bg-clip-text text-transparent drop-shadow-lg">
                            TimbaOS
                        </span>
                    </h1>
                    
                    <p className="text-2xl text-walnut-deep max-w-3xl mx-auto leading-relaxed">
                        Where <span className="font-display italic text-cherry-bright font-bold">craft meets code</span>.
                        <br />
                        <span className="text-xl text-walnut-medium">A handcrafted ERP system for modern lumber yards.</span>
                    </p>
                    
                    {/* CTA Buttons */}
                    <div className="flex gap-6 justify-center pt-8">
                        <Link
                            href="/dashboard"
                            className="group px-12 py-6 texture-brass text-char font-bold text-lg rounded-organic-2 glow-brass flex items-center gap-3 shadow-organic-lg border-2 border-brass-bright/30"
                        >
                            <span className="relative z-10">Launch Dashboard</span>
                            <ArrowRight className="h-6 w-6 relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
                        </Link>
                        
                        <Link
                            href="/dashboard/products"
                            className="px-12 py-6 texture-paper bg-white text-mahogany-deep font-bold text-lg rounded-organic-2 border-3 border-walnut-medium/30 hover:border-brass/60 hover:shadow-organic-lg transition-all duration-400 shadow-organic"
                        >
                            View Products
                        </Link>
                    </div>
                    
                    <div className="text-walnut-medium text-base pt-6 font-medium">
                        🌲 <span className="font-mono text-cherry-warm">5 Locations</span>  •  <span className="font-mono text-cherry-warm">200+ Products</span>  •  <span className="text-brass">AI-Powered</span>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {/* Card 1 - Multi-Location */}
                    <div className="group texture-paper bg-white rounded-organic-1 p-10 border-2 border-walnut-medium/20 hover:border-brass/50 shadow-organic hover:shadow-organic-lg hover-lift">
                        <div className="w-16 h-16 rounded-organic-2 wood-mahogany flex items-center justify-center mb-6 shadow-organic group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                            <MapPin className="h-8 w-8 text-cream drop-shadow-lg" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-mahogany-deep mb-4">Multi-Location</h3>
                        <p className="text-walnut-medium leading-relaxed text-base">
                            Seamlessly manage multiple stores, warehouses, and distribution centers from one unified system.
                        </p>
                    </div>

                    {/* Card 2 - AI-Powered */}
                    <div className="group texture-paper bg-white rounded-organic-1 p-10 border-2 border-walnut-medium/20 hover:border-brass/50 shadow-organic hover:shadow-organic-lg hover-lift">
                        <div className="w-16 h-16 rounded-organic-2 bg-gradient-to-br from-cherry-warm to-cherry-bright flex items-center justify-center mb-6 shadow-organic group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                            <Bot className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-cherry-warm mb-4">AI-Powered</h3>
                        <p className="text-walnut-medium leading-relaxed text-base">
                            Intelligent agents monitor inventory, optimize operations, and provide actionable insights automatically.
                        </p>
                    </div>

                    {/* Card 3 - Real-Time */}
                    <div className="group texture-paper bg-white rounded-organic-1 p-10 border-2 border-walnut-medium/20 hover:border-brass/50 shadow-organic hover:shadow-organic-lg hover-lift">
                        <div className="w-16 h-16 rounded-organic-2 texture-brass flex items-center justify-center mb-6 shadow-organic group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                            <BarChart3 className="h-8 w-8 text-char drop-shadow-md" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-brass mb-4">Real-Time Data</h3>
                        <p className="text-walnut-medium leading-relaxed text-base">
                            Track inventory, orders, and performance metrics across all locations with live updates.
                        </p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="text-center pt-12 border-t-2 border-walnut-medium/20">
                    <p className="text-sm font-bold text-walnut-deep mb-5 tracking-widest uppercase">Quick Access</p>
                    <div className="flex gap-8 justify-center text-base flex-wrap">
                        <Link href="/dashboard/orders" className="text-cherry-warm hover:text-cherry-bright font-semibold hover:underline decoration-2 underline-offset-4 transition-all">Orders</Link>
                        <Link href="/dashboard/customers" className="text-cherry-warm hover:text-cherry-bright font-semibold hover:underline decoration-2 underline-offset-4 transition-all">Customers</Link>
                        <Link href="/dashboard/analytics" className="text-cherry-warm hover:text-cherry-bright font-semibold hover:underline decoration-2 underline-offset-4 transition-all">Analytics</Link>
                        <Link href="/dashboard/chat" className="text-cherry-warm hover:text-cherry-bright font-semibold hover:underline decoration-2 underline-offset-4 transition-all">AI Chat</Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
