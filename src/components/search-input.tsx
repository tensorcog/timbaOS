"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

interface SearchInputProps {
    placeholder?: string;
    baseUrl: string;
}

export function SearchInput({ placeholder = "Search...", baseUrl }: SearchInputProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');

    useEffect(() => {
        const currentQuery = searchParams.get('q') || '';
        setQuery(currentQuery);
    }, [searchParams]);

    const handleSearch = (value: string) => {
        setQuery(value);
        
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('q', value);
        } else {
            params.delete('q');
        }
        
        const queryString = params.toString();
        router.push(queryString ? `${baseUrl}?${queryString}` : baseUrl);
    };

    return (
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
            />
        </div>
    );
}
