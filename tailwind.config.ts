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
                // Digital Arboretum Brand Colors
                spruce: '#264653',
                teal: '#2A9D8F',
                gold: '#E9C46A',
                clay: '#E76F51',
                charcoal: '#1B262C',
                canvas: '#F4F1DE',
                'weathered-grey': '#8D99AE',
                
                // System colors mapped to theme
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
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Space Grotesk', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                'sanded': '12px', // The signature "sanded" corner look
            },
            boxShadow: {
                'groove': '0 4px 6px -1px rgba(38, 70, 83, 0.1)',
                'float': '0 10px 15px -3px rgba(38, 70, 83, 0.15)',
                'warm-sm': '0 1px 2px 0 rgb(38 70 83 / 0.05)',
                'warm': '0 1px 3px 0 rgb(38 70 83 / 0.1), 0 1px 2px -1px rgb(38 70 83 / 0.1)',
                'warm-md': '0 4px 6px -1px rgb(38 70 83 / 0.1), 0 2px 4px -2px rgb(38 70 83 / 0.1)',
                'warm-lg': '0 10px 15px -3px rgb(38 70 83 / 0.1), 0 4px 6px -4px rgb(38 70 83 / 0.1)',
                'warm-xl': '0 20px 25px -5px rgb(38 70 83 / 0.1), 0 8px 10px -6px rgb(38 70 83 / 0.1)',
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
