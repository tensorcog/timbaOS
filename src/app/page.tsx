import Link from "next/link";
import { ArrowRight, MapPin, Bot, BarChart3 } from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen mesh-gradient flex items-center justify-center p-8 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-20 right-20 w-64 h-64 bg-cherry-warm/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-brass/10 rounded-full blur-3xl" />
            
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Hero Section */}
                <div className="text-center space-y-8 mb-16 animate-fade-in">
                    <div className="inline-block px-6 py-2 bg-mahogany-deep/10 border-2 border-brass/30 rounded-organic-2 mb-4">
                        <span className="text-brass font-mono text-sm font-semibold tracking-wider">DIGITAL SAWMILL WORKSHOP</span>
                    </div>
                    
                    <h1 className="text-8xl font-display font-black tracking-tight leading-none">
                        <span className="bg-gradient-to-br from-mahogany-deep via-cherry-warm to-mahogany-rich bg-clip-text text-transparent">
                            TimbaOS
                        </span>
                    </h1>
                    
                    <p className="text-2xl text-walnut-medium max-w-3xl mx-auto leading-relaxed font-light">
                        Where <span className="font-display italic text-cherry-warm">craft meets code</span>.
                        A bold, creative ERP system designed for modern lumber yards.
                    </p>
                    
                    {/* CTA Buttons */}
                    <div className="flex gap-4 justify-center pt-6">
                        <Link
                            href="/dashboard"
                            className="group px-10 py-5 bg-gradient-to-br from-brass-vintage to-brass-bright text-char font-bold text-lg rounded-organic-2 glow-brass hover:scale-105 transition-all duration-200 flex items-center gap-3 shadow-elevated"
                        >
                            Launch Dashboard
                            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        
                        <Link
                            href="/dashboard/products"
                            className="px-10 py-5 bg-white/80 text-mahogany-deep font-semibold text-lg rounded-organic-2 border-2 border-walnut-medium/20 hover:border-brass/50 hover:bg-white transition-all duration-200 shadow-layered hover:shadow-elevated"
                        >
                            View Products
                        </Link>
                    </div>
                    
                    <div className="text-walnut-medium/70 text-sm pt-4">
                        🌲 <span className="font-mono">5 Locations</span>  •  <span className="font-mono">200+ Products</span>  •  <span>AI-Powered</span>
                    </div>
                </div>

                {/* Feature Cards - Asymmetric Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Card 1 - Multi-Location */}
                    <div className="group bg-white wood-grain-light rounded-organic-1 p-8 border-2 border-walnut-medium/10 hover:border-brass/40 shadow-layered hover:shadow-elevated hover:-translate-y-2 transition-all duration-300">
                        <div className="w-14 h-14 rounded-organic-2 bg-gradient-to-br from-mahogany-deep to-cherry-warm flex items-center justify-center mb-5 shadow-layered group-hover:scale-110 transition-transform">
                            <MapPin className="h-7 w-7 text-cream" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-mahogany-deep mb-3">Multi-Location</h3>
                        <p className="text-walnut-medium leading-relaxed">
                            Seamlessly manage multiple stores, warehouses, and distribution centers from one unified system.
                        </p>
                    </div>

                    {/* Card 2 - AI-Powered */}
                    <div className="group bg-white wood-grain-light rounded-organic-1 p-8 border-2 border-walnut-medium/10 hover:border-brass/40 shadow-layered hover:shadow-elevated hover:-translate-y-2 transition-all duration-300">
                        <div className="w-14 h-14 rounded-organic-2 bg-gradient-to-br from-cherry-warm to-cherry-bright flex items-center justify-center mb-5 shadow-layered group-hover:scale-110 transition-transform">
                            <Bot className="h-7 w-7 text-cream" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-cherry-warm mb-3">AI-Powered</h3>
                        <p className="text-walnut-medium leading-relaxed">
                            Intelligent agents monitor inventory, optimize operations, and provide actionable insights.
                        </p>
                    </div>

                    {/* Card 3 - Real-Time */}
                    <div className="group bg-white wood-grain-light rounded-organic-1 p-8 border-2 border-walnut-medium/10 hover:border-brass/40 shadow-layered hover:shadow-elevated hover:-translate-y-2 transition-all duration-300">
                        <div className="w-14 h-14 rounded-organic-2 bg-gradient-to-br from-brass-vintage to-maple-golden flex items-center justify-center mb-5 shadow-layered group-hover:scale-110 transition-transform">
                            <BarChart3 className="h-7 w-7 text-char" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-brass mb-3">Real-Time Data</h3>
                        <p className="text-walnut-medium leading-relaxed">
                            Track inventory, orders, and performance metrics across all locations in real-time.
                        </p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="text-center pt-8 border-t-2 border-walnut-medium/10">
                    <p className="text-sm font-semibold text-walnut-medium/60 mb-4 tracking-wider uppercase">Quick Access</p>
                    <div className="flex gap-6 justify-center text-sm flex-wrap">
                        <Link href="/dashboard/orders" className="text-cherry-warm hover:text-cherry-bright font-medium transition-colors">Orders</Link>
                        <Link href="/dashboard/customers" className="text-cherry-warm hover:text-cherry-bright font-medium transition-colors">Customers</Link>
                        <Link href="/dashboard/analytics" className="text-cherry-warm hover:text-cherry-bright font-medium transition-colors">Analytics</Link>
                        <Link href="/dashboard/chat" className="text-cherry-warm hover:text-cherry-bright font-medium transition-colors">AI Chat</Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
