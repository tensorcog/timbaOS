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
                // Sawmill Workshop Palette - Rich & Dramatic
                mahogany: {
                    deep: '#4A1C1C',
                    rich: '#6B2929',
                    DEFAULT: '#4A1C1C',
                },
                cherry: {
                    warm: '#8B3A3A',
                    bright: '#A64D4D',
                    DEFAULT: '#8B3A3A',
                },
                maple: {
                    golden: '#D4A574',
                    light: '#E8C592',
                    DEFAULT: '#D4A574',
                },
                walnut: {
                    deep: '#3E2723',
                    medium: '#5D4037',
                    DEFAULT: '#3E2723',
                },
                brass: {
                    vintage: '#B8860B',
                    bright: '#DAA520',
                    DEFAULT: '#B8860B',
                },
                cream: '#FAF4E8',
                char: '#1A1110',
                
                // System colors mapped to new palette
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
                display: ['Playfair Display', 'Georgia', 'serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                // Organic asymmetric patterns
                'organic-1': '24px 8px 24px 8px',
                'organic-2': '16px 4px 16px 4px',
                'organic-3': '32px 12px 32px 12px',
            },
            boxShadow: {
                // Layered 3D shadow system
                'layered': '0 1px 3px rgba(74, 28, 28, 0.12), 0 8px 24px rgba(74, 28, 28, 0.18)',
                'elevated': '0 4px 6px rgba(74, 28, 28, 0.12), 0 12px 32px rgba(74, 28, 28, 0.24), inset 0 1px 0 rgba(250, 244, 232, 0.1)',
                'floating': '0 8px 16px rgba(74, 28, 28, 0.16), 0 16px 48px rgba(74, 28, 28, 0.32)',
                'brass-glow': '0 4px 12px rgba(184, 134, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                'brass-glow-hover': '0 6px 20px rgba(184, 134, 11, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'grain-shift': 'grainShift 20s ease-in-out infinite',
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
                grainShift: {
                    '0%, 100%': { backgroundPosition: '0% 0%' },
                    '50%': { backgroundPosition: '100% 100%' },
                },
            },
        },
    },
    plugins: [],
};
export default config;
