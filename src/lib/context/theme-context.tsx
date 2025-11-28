"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'DEFAULT' | 'OCEAN' | 'FOREST' | 'SUNSET';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('DEFAULT');
    const [isLoading, setIsLoading] = useState(true);

    // Load theme from preferences on mount
    useEffect(() => {
        async function loadTheme() {
            try {
                const response = await fetch('/api/users/preferences');
                if (response.ok) {
                    const data = await response.json();
                    setThemeState(data.theme || 'DEFAULT');
                    applyTheme(data.theme || 'DEFAULT');
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadTheme();
    }, []);

    const applyTheme = (newTheme: Theme) => {
        document.documentElement.setAttribute('data-theme', newTheme.toLowerCase());
    };

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        applyTheme(newTheme);

        // Save to database
        try {
            await fetch('/api/users/preferences', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ theme: newTheme }),
            });
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
