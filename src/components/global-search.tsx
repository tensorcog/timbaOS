"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";


export function GlobalSearch() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [term, setTerm] = useState(searchParams.get("q")?.toString() || "");

    // Simple debounce implementation inside the component since we don't have a hook library yet
    // actually, let's just use useEffect for debounce here to keep it simple and self-contained
    // or better, let's create a use-debounce hook file first if I wanted to be reusable, 
    // but for now I'll just do it inline or create a utility file.
    // Let's do it inline for simplicity as requested in the plan.

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams);
            if (term) {
                params.set("q", term);
            } else {
                params.delete("q");
            }
            replace(`${pathname}?${params.toString()}`);
        }, 300);

        return () => clearTimeout(timer);
    }, [term, pathname, replace, searchParams]);

    // Determine placeholder based on route
    let placeholder = "Search...";
    if (pathname.includes("/dashboard/orders")) {
        placeholder = "Search by Name or Order Number...";
    } else if (pathname.includes("/dashboard/products")) {
        placeholder = "Search products...";
    } else if (pathname.includes("/dashboard/customers")) {
        placeholder = "Search customers...";
    }

    return (
        <div className="w-full flex-1">
            <form onSubmit={(e) => e.preventDefault()}>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder={placeholder}
                        className="w-full appearance-none bg-muted border border-border rounded-lg pl-8 h-9 shadow-none md:w-2/3 lg:w-1/3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                    />
                </div>
            </form>
        </div>
    );
}
