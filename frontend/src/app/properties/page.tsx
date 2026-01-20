'use client';

import { useEffect, useState, useCallback } from "react";
import { PropertyCard } from "@/components/PropertyCard";
import { Search, X, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useDebounce } from "@/lib/hooks";
import { ApiProperty, Property, mapApiPropertyToCard } from "@/lib/property-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [propertyType, setPropertyType] = useState<string>('');
    const [priceAssessment, setPriceAssessment] = useState<string>('');
    const [rooms, setRooms] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const pageSize = 12;

    // Debounce search query to avoid too many API calls
    const debouncedSearch = useDebounce(searchQuery, 300);

    const fetchProperties = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });

            if (propertyType) params.append('property_type', propertyType);
            if (priceAssessment) params.append('price_assessment', priceAssessment);
            if (rooms) params.append('rooms', rooms);
            if (debouncedSearch) params.append('search', debouncedSearch);

            const response = await fetch(`${API_URL}/api/v1/properties?${params}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch properties: ${response.statusText}`);
            }

            const data = await response.json();
            const mappedProperties = data.items.map(mapApiPropertyToCard);
            setProperties(mappedProperties);
            setTotal(data.total);
        } catch (err) {
            console.error('Error fetching properties:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch properties');
        } finally {
            setLoading(false);
        }
    }, [page, propertyType, priceAssessment, rooms, debouncedSearch]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [propertyType, priceAssessment, rooms, debouncedSearch]);

    const clearSearch = () => {
        setSearchQuery('');
    };

    const clearAllFilters = () => {
        setPropertyType('');
        setPriceAssessment('');
        setRooms('');
        setSearchQuery('');
        setPage(1);
    };

    const hasActiveFilters = propertyType || priceAssessment || rooms || searchQuery;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                        Prague Properties
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {total} properties found
                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="ml-2 text-primary hover:text-primary-dark text-sm"
                            >
                                Clear all filters
                            </button>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, location..."
                            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 md:w-72"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowMobileFilters(!showMobileFilters)}
                        className="lg:hidden flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Filters Sidebar */}
                <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block space-y-6`}>
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Filters</h3>
                            <button
                                onClick={() => setShowMobileFilters(false)}
                                className="lg:hidden text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block text-slate-700 dark:text-slate-300">Property Type</label>
                                <select
                                    value={propertyType}
                                    onChange={(e) => setPropertyType(e.target.value)}
                                    className="w-full rounded-lg px-3 py-2 border text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                >
                                    <option value="">All Types</option>
                                    <option value="apartment">Apartments</option>
                                    <option value="house">Houses</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block text-slate-700 dark:text-slate-300">Price Assessment</label>
                                <select
                                    value={priceAssessment}
                                    onChange={(e) => setPriceAssessment(e.target.value)}
                                    className="w-full rounded-lg px-3 py-2 border text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                >
                                    <option value="">All</option>
                                    <option value="below_market">Below Market (Best Deals)</option>
                                    <option value="at_market">Fair Price</option>
                                    <option value="above_market">Above Market</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block text-slate-700 dark:text-slate-300">Rooms</label>
                                <select
                                    value={rooms}
                                    onChange={(e) => setRooms(e.target.value)}
                                    className="w-full rounded-lg px-3 py-2 border text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                >
                                    <option value="">Any</option>
                                    <option value="1+kk">1+kk</option>
                                    <option value="1+1">1+1</option>
                                    <option value="2+kk">2+kk</option>
                                    <option value="2+1">2+1</option>
                                    <option value="3+kk">3+kk</option>
                                    <option value="3+1">3+1</option>
                                    <option value="4+kk">4+kk</option>
                                    <option value="4+1">4+1</option>
                                    <option value="5+kk">5+kk</option>
                                    <option value="5+1">5+1</option>
                                </select>
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearAllFilters}
                                    className="w-full bg-slate-100 text-slate-700 rounded-lg py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Property Grid */}
                <div className="lg:col-span-3">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                            <RefreshCw className="h-8 w-8 animate-spin mb-4 text-primary" />
                            <p className="text-lg">Loading properties...</p>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                            <p className="text-red-800 dark:text-red-400 font-medium mb-2">Error loading properties</p>
                            <p className="text-red-600 dark:text-red-400/80 text-sm mb-4">{error}</p>
                            <button
                                onClick={fetchProperties}
                                className="flex items-center gap-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg transition-colors dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Try Again
                            </button>
                        </div>
                    )}

                    {!loading && !error && properties.length === 0 && (
                        <div className="text-center py-16 text-slate-500">
                            <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No properties found</p>
                            <p className="text-slate-500 dark:text-slate-400 mb-4">Try adjusting your search or filters</p>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearAllFilters}
                                    className="text-primary hover:text-primary-dark font-medium"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && !error && properties.length > 0 && (
                        <>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {properties.map((property) => (
                                    <PropertyCard key={property.id} property={property} />
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="mt-6 flex items-center justify-between">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-lg border bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    Page {page} of {Math.ceil(total / pageSize)}
                                </span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * pageSize >= total}
                                    className="px-4 py-2 rounded-lg border bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}