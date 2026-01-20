import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Chatbot } from "@/components/Chatbot";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
    title: "Prague Real Estate Price Analyzer",
    description: "AI-powered real estate price analysis for Prague properties. Discover undervalued properties and make informed investment decisions.",
    keywords: ["Prague", "real estate", "property", "investment", "AI", "price analysis"],
    authors: [{ name: "Prague Real Estate" }],
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cn(inter.className, "min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col")}>
                <Navbar />
                <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
                    {children}
                </main>
                <footer className="border-t bg-white dark:bg-slate-900 dark:border-slate-800 mt-auto">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <p>Prague Real Estate Price Analyzer</p>
                            <p>AI-powered property insights for smarter investments</p>
                        </div>
                    </div>
                </footer>
                <Chatbot />
            </body>
        </html>
    );
}
