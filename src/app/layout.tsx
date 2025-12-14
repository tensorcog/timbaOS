import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: '--font-display' });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
    title: "TimbaOS - Digital Arboretum",
    description: "Modern ERP for lumber yards - Digital Arboretum design system",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans`}>
                <Providers>
                    {children}
                    <ToastProvider />
                </Providers>
            </body>
        </html>
    );
}
