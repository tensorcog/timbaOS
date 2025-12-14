import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom timber/wood color palette
                timber: {
                    50: '#fdf8f6',   // Lightest birch
                    100: '#f2e8e5',  // Light pine
                    200: '#eaddd7',  // Cream
                    300: '#e0cec7',  // Light oak
                    400: '#d2bab0',  // Medium oak
                    500: '#b68d82',  // Walnut
                    600: '#a47566',  // Dark walnut
                    700: '#8b5839',  // Cedar
                    800: '#603813',  // Dark wood
                    900: '#3d1f0e',  // Espresso
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            boxShadow: {
                'warm-sm': '0 1px 2px 0 rgb(139 88 57 / 0.05)',
                'warm': '0 1px 3px 0 rgb(139 88 57 / 0.1), 0 1px 2px -1px rgb(139 88 57 / 0.1)',
                'warm-md': '0 4px 6px -1px rgb(139 88 57 / 0.1), 0 2px 4px -2px rgb(139 88 57 / 0.1)',
                'warm-lg': '0 10px 15px -3px rgb(139 88 57 / 0.1), 0 4px 6px -4px rgb(139 88 57 / 0.1)',
                'warm-xl': '0 20px 25px -5px rgb(139 88 57 / 0.1), 0 8px 10px -6px rgb(139 88 57 / 0.1)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};
export default config;
