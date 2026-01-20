'use client';

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, Home as HomeIcon, Building, Database, RefreshCw, AlertCircle, WifiOff } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { PriceTrendChart } from "@/components/PriceTrendChart";
import { ApiProperty, Property, mapApiPropertyToCard } from "@/lib/property-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface MarketOverview {
    total_properties: number;
    avg_price: number;
    avg_price_per_sqm: number;
    below_market_count: number;
    at_market_count: number;
    above_market_count: number;
    by_city: Record<string, { count: number; avg_price: number }>;
    by_property_type: Record<string, { count: number; avg_price: number }>;
}

interface SeedStatus {
    total_properties: number;
    sample_properties: number;
    sample_data_ready: boolean;
}

export default function Home() {
    const [recentProperties, setRecentProperties] = useState<Property[]>([]);
    const [marketOverview, setMarketOverview] = useState<MarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [seeding, setSeeding] = useState(false);
    const [needsSeed, setNeedsSeed] = useState(false);
    const [apiConnected, setApiConnected] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setApiConnected(true);

            // Check seed status first
            try {
                const statusResponse = await fetch(`${API_URL}/api/v1/seed/status`);
                if (statusResponse.ok) {
                    const status: SeedStatus = await statusResponse.json();
                    setNeedsSeed(status.total_properties === 0);
                }
            } catch {
                setApiConnected(false);
            }

            // Fetch recent properties
            const propertiesResponse = await fetch(
                `${API_URL}/api/v1/properties?page_size=6&sort_by=scraped_at&sort_order=desc`
            );

            if (propertiesResponse.ok) {
                const propertiesData = await propertiesResponse.json();
                const mappedProperties = propertiesData.items.map(mapApiPropertyToCard);
                setRecentProperties(mappedProperties);
            } else {
                throw new Error('Failed to fetch properties');
            }

            // Fetch market overview
            const overviewResponse = await fetch(`${API_URL}/api/v1/analytics/market-overview`);

            if (overviewResponse.ok) {
                const overviewData = await overviewResponse.json();
                setMarketOverview(overviewData);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
            setApiConnected(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSeedData = async () => {
        try {
            setSeeding(true);
            const response = await fetch(`${API_URL}/api/v1/seed/sample-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clear_existing: false, run_predictions: true }),
            });

            if (response.ok) {
                // Refresh data after seeding
                await fetchData();
                setNeedsSeed(false);
            }
        } catch (err) {
            console.error('Error seeding data:', err);
        } finally {
            setSeeding(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate stats from market overview
    const totalProperties = marketOverview?.total_properties || 0;
    const belowMarketPercent = marketOverview
        ? Math.round((marketOverview.below_market_count / totalProperties) * 100)
        : 0;
    const avgHousePrice = marketOverview?.by_property_type?.house?.avg_price || 0;
    const avgAptPrice = marketOverview?.by_property_type?.apartment?.avg_price || 0;

    return (
        <div className="space-y-8">
            {/* API Connection Error Banner */}
            {!apiConnected && !loading && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <div>
                                <p className="font-medium text-red-800 dark:text-red-200">Unable to connect to the API</p>
                                <p className="text-sm text-red-600 dark:text-red-400">Make sure the backend server is running at {API_URL}</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchData}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 font-medium text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry Connection
                        </button>
                    </div>
                </div>
            )}

            {/* Seed Data Banner */}
            {needsSeed && apiConnected && (
                <div className="rounded-xl bg-secondary-50 border border-secondary-200 p-4 dark:bg-secondary-900/20 dark:border-secondary-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Database className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                            <div>
                                <p className="font-medium text-secondary-800 dark:text-secondary-200">No property data found</p>
                                <p className="text-sm text-secondary-600 dark:text-secondary-400">Load sample Prague property data to get started</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSeedData}
                            disabled={seeding}
                            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 font-medium text-secondary-900 hover:bg-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {seeding ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Database className="h-4 w-4" />
                                    Load Sample Data
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <section className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-12 text-white shadow-xl">
                <div className="mx-auto max-w-4xl text-center">
                    <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                        Prague Real Estate Price Analyzer
                    </h1>
                    <p className="mb-8 text-lg text-primary-100 md:text-xl">
                        AI-powered insights for Prague property market. Discover undervalued properties and make informed investment decisions.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/properties"
                            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-semibold text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                        >
                            Browse Properties
                        </Link>
                        <Link
                            href="/map"
                            className="inline-flex items-center justify-center rounded-lg border-2 border-white bg-transparent px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
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
                        <div className="rounded-lg bg-primary-100 p-3 text-primary dark:bg-primary-900/30 dark:text-primary-400">
                            <Building className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Properties</p>
                            {loading ? (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">...</p>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                                    {totalProperties.toLocaleString()}
                                </p>
                            )}
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
                            {loading ? (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">...</p>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{belowMarketPercent}%</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-secondary-100 p-3 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400">
                            <HomeIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg House Price</p>
                            {loading ? (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">...</p>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                                    {avgHousePrice > 0 ? `${(avgHousePrice / 1000000).toFixed(1)}M` : 'N/A'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-primary-100 p-3 text-primary dark:bg-primary-900/30 dark:text-primary-400">
                            <Building className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg Apt Price</p>
                            {loading ? (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">...</p>
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                                    {avgAptPrice > 0 ? `${(avgAptPrice / 1000000).toFixed(1)}M` : 'N/A'}
                                </p>
                            )}
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
                        <Link href="/properties" className="flex items-center text-primary hover:text-primary-dark dark:text-primary-400">
                            View all <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </div>
                    {loading ? (
                        <div className="grid gap-6 sm:grid-cols-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800 animate-pulse">
                                    <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg mb-4"></div>
                                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-3/4"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-1/2"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                                </div>
                            ))}
                        </div>
                    ) : recentProperties.length === 0 ? (
                        <div className="rounded-xl border bg-white p-12 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
                            <Building className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No properties found</p>
                            <p className="text-slate-500 dark:text-slate-400 mb-4">
                                {apiConnected
                                    ? "Load sample data or run the scrapers to populate properties."
                                    : "Connect to the API to see properties."}
                            </p>
                            {apiConnected && needsSeed && (
                                <button
                                    onClick={handleSeedData}
                                    disabled={seeding}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
                                >
                                    <Database className="h-4 w-4" />
                                    Load Sample Data
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2">
                            {recentProperties.map((property) => (
                                <PropertyCard key={property.id} property={property} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Market Trends - Takes up 1 column */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Market Trends</h2>
                    <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <PriceTrendChart />
                    </div>
                </div>
            </div>
        </div>
    );
}
