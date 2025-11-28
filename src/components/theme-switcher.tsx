"use client";

import { useTheme } from '@/lib/context/theme-context';
import { Check } from 'lucide-react';

const themes = [
    {
        id: 'DEFAULT' as const,
        name: 'Default',
        description: 'Purple & Blue gradient',
        preview: 'from-purple-500 to-blue-600',
    },
    {
        id: 'OCEAN' as const,
        name: 'Ocean',
        description: 'Teal & Cyan waves',
        preview: 'from-teal-500 to-cyan-600',
    },
    {
        id: 'FOREST' as const,
        name: 'Forest',
        description: 'Green & Emerald nature',
        preview: 'from-green-500 to-emerald-600',
    },
    {
        id: 'SUNSET' as const,
        name: 'Sunset',
        description: 'Orange & Rose warmth',
        preview: 'from-orange-500 to-rose-600',
    },
];

export function ThemeSwitcher() {
    const { theme, setTheme, isLoading } = useTheme();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {themes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`relative p-4 rounded-lg border-2 transition-all hover:scale-105 ${theme === t.id
                            ? 'border-primary shadow-lg'
                            : 'border-border hover:border-primary/50'
                        }`}
                >
                    <div className={`h-16 rounded-md bg-gradient-to-br ${t.preview} mb-3`} />
                    <div className="text-left">
                        <h3 className="font-semibold text-sm">{t.name}</h3>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    {theme === t.id && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-3 w-3" />
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}
