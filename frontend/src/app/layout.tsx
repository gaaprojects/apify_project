import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Czech Real Estate Price Analyzer",
    description: "Analyze and predict real estate prices in Czech Republic",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={cn(inter.className, "min-h-screen bg-slate-50 dark:bg-slate-950")}>
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                    {children}
                </main>
            </body>
        </html>
    );
}
