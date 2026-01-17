import Link from "next/link";
import { ArrowRight, TrendingUp, Home as HomeIcon, Building } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { PriceTrendChart } from "@/components/PriceTrendChart";

// Mock data
const recentProperties = [
    {
        id: 1,
        title: "Brand new apartment in Karlín",
        price: 8500000,
        location: "Prague 8 - Karlín",
        rooms: "2+kk",
        area: 55,
        imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800",
        assessment: "below_market" as const,
    },
    {
        id: 2,
        title: "Family house with garden",
        price: 15900000,
        location: "Prague-West",
        rooms: "5+1",
        area: 180,
        imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800",
        assessment: "at_market" as const,
    },
    {
        id: 3,
        title: "Luxury Penthouse",
        price: 25000000,
        location: "Prague 1 - Old Town",
        rooms: "4+kk",
        area: 120,
        imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800",
        assessment: "above_market" as const,
    },
];

export default function Home() {
    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-12 text-white shadow-xl dark:from-blue-900 dark:to-indigo-900">
                <div className="mx-auto max-w-4xl text-center">
                    <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                        Czech Real Estate Price Analyzer
                    </h1>
                    <p className="mb-8 text-lg text-blue-100 md:text-xl">
                        AI-powered insights for the property market. Discover undervalued properties and make informed decisions.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/properties"
                            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-blue-700"
                        >
                            Browse Properties
                        </Link>
                        <Link
                            href="/map"
                            className="inline-flex items-center justify-center rounded-lg border-2 border-white bg-transparent px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
                        >
                            View on Map
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Building className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Properties</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">1,248</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Undervalued</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">12%</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                            <HomeIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg House Price</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">12.5M</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-orange-100 p-3 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            <Building className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg Apt Price</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">8.2M</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Recent Properties - Takes up 2 columns */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Recent Opportunities</h2>
                        <Link href="/properties" className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400">
                            View all <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        {recentProperties.map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))}
                    </div>
                </div>

                {/* Market Trends - Takes up 1 column */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Market Trends</h2>
                    <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <PriceTrendChart />
                    </div>
                    {/* Add more widgets here if needed */}
                </div>
            </div>
        </div>
    );
}
