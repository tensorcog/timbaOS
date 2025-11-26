"use client";

import { useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { useLocation } from "@/lib/context/location-context";

export function AgentInterface() {
    const { currentLocation } = useLocation();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const runAgent = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/agent/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locationId: currentLocation?.id }),
            });
            const data = await res.json();
            setResult(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent backdrop-blur">
            <div className="flex flex-col space-y-1.5 p-6">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                            AI Agent: StockWatcher
                            <Sparkles className="h-4 w-4 text-purple-400" />
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Autonomous inventory monitoring
                        </p>
                    </div>
                </div>
            </div>
            <div className="p-6 pt-0">
                <div className="flex flex-col gap-4">
                    <button
                        onClick={runAgent}
                        disabled={loading}
                        className="relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:from-purple-600 hover:to-blue-700 h-11 px-8 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing Inventory...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Run Agent Now
                            </>
                        )}
                    </button>

                    {result && (
                        <div className="rounded-lg bg-muted/50 p-4 border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`h-2 w-2 rounded-full ${result.success ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                                <span className="text-sm font-medium">
                                    {result.success ? 'Analysis Complete' : 'Error'}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{result.message}</p>
                            {result.data && result.data.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-purple-400">Low Stock Items:</p>
                                    {result.data.map((item: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-1 text-xs bg-background/50 p-2 rounded">
                                            <div className="flex justify-between">
                                                <span className="font-medium">{item.product}</span>
                                                <span className="text-red-400 font-semibold">{item.stockLevel} left</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>{item.location} • {item.sku}</span>
                                                <span>Reorder: {item.needsRestock}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
