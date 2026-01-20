'use client';

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, BedDouble, Ruler, Building, Share2, Heart, Loader2, ExternalLink, Check, Copy } from "lucide-react";
import { PriceIndicator } from "@/components/PriceIndicator";
import { PriceTrendChart } from "@/components/PriceTrendChart";
import { useLocalStorage } from "@/lib/hooks";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PropertyDetail {
    id: number;
    title: string;
    description: string | null;
    price: number | null;
    predicted_price: number | null;
    price_deviation_percent: number | null;
    price_assessment: "below_market" | "at_market" | "above_market" | null;
    address_city: string | null;
    address_district: string | null;
    address_street: string | null;
    rooms: string | null;
    area_usable: number | null;
    floor: number | null;
    floors_total: number | null;
    main_image_url: string | null;
    has_balcony: boolean;
    has_terrace: boolean;
    has_parking: boolean;
    has_elevator: boolean;
    has_cellar: boolean;
    has_garden: boolean;
    has_garage: boolean;
    condition: string | null;
    construction_type: string | null;
    url: string | null;
}

function getFeaturesList(property: PropertyDetail): string[] {
    const features: string[] = [];
    if (property.has_balcony) features.push("Balcony");
    if (property.has_terrace) features.push("Terrace");
    if (property.has_parking) features.push("Parking");
    if (property.has_elevator) features.push("Elevator");
    if (property.has_cellar) features.push("Cellar");
    if (property.has_garden) features.push("Garden");
    if (property.has_garage) features.push("Garage");
    if (property.condition) features.push(property.condition.charAt(0).toUpperCase() + property.condition.slice(1));
    if (property.construction_type) features.push(property.construction_type);
    return features;
}

function getLocationString(property: PropertyDetail): string {
    const parts = [property.address_street, property.address_district, property.address_city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Prague';
}

export default function PropertyDetailPage() {
    const params = useParams();
    const propertyId = params.id as string;

    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [favorites, setFavorites] = useLocalStorage<number[]>('property_favorites', []);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

    const isFavorite = favorites.includes(Number(propertyId));

    const toggleFavorite = useCallback(() => {
        const id = Number(propertyId);
        if (isFavorite) {
            setFavorites(favorites.filter(fav => fav !== id));
        } else {
            setFavorites([...favorites, id]);
        }
    }, [propertyId, isFavorite, favorites, setFavorites]);

    const handleShare = useCallback(async () => {
        const url = window.location.href;
        const title = property?.title || 'Property Listing';

        // Try native share API first (mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: `Check out this property: ${title}`,
                    url: url,
                });
                return;
            } catch (err) {
                // User cancelled or share failed, fall back to clipboard
                if ((err as Error).name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        }

        // Fall back to clipboard copy
        try {
            await navigator.clipboard.writeText(url);
            setShareStatus('copied');
            setTimeout(() => setShareStatus('idle'), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }, [property?.title]);

    const handleContactSeller = useCallback(() => {
        if (property?.url) {
            window.open(property.url, '_blank', 'noopener,noreferrer');
        }
    }, [property?.url]);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`${API_URL}/api/v1/properties/${propertyId}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Property not found');
                    }
                    throw new Error('Failed to fetch property details');
                }

                const data = await response.json();
                setProperty(data);
            } catch (err) {
                console.error('Error fetching property:', err);
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (propertyId) {
            fetchProperty();
        }
    }, [propertyId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-slate-600 dark:text-slate-400">Loading property details...</p>
                </div>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="space-y-6">
                <Link
                    href="/properties"
                    className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Properties
                </Link>
                <div className="rounded-xl border bg-white p-8 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <p className="text-lg font-medium text-red-600 dark:text-red-400">
                        {error || 'Property not found'}
                    </p>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">
                        The property you're looking for might have been removed or is no longer available.
                    </p>
                </div>
            </div>
        );
    }

    const features = getFeaturesList(property);
    const location = getLocationString(property);
    const assessment = property.price_assessment || 'at_market';

    return (
        <div className="space-y-6">
            <Link
                href="/properties"
                className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Properties
            </Link>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Image */}
                    <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        {property.main_image_url ? (
                            <img
                                src={property.main_image_url}
                                alt={property.title || 'Property'}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-400">
                                <Building className="h-16 w-16" />
                            </div>
                        )}
                    </div>

                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                                    {property.title || `${property.rooms || ''} Property in ${property.address_district || 'Prague'}`}
                                </h1>
                                <div className="mt-2 flex items-center text-slate-600 dark:text-slate-400">
                                    <MapPin className="mr-2 h-4 w-4" />
                                    {location}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleShare}
                                    className="rounded-full border p-2.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors relative group"
                                    title={shareStatus === 'copied' ? 'Link copied!' : 'Share property'}
                                >
                                    {shareStatus === 'copied' ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Share2 className="h-4 w-4" />
                                    )}
                                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-slate-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap dark:bg-slate-700">
                                        {shareStatus === 'copied' ? 'Copied!' : 'Share'}
                                    </span>
                                </button>
                                <button
                                    onClick={toggleFavorite}
                                    className={`rounded-full border p-2.5 transition-colors relative group ${
                                        isFavorite
                                            ? 'bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800'
                                            : 'hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                                    }`}
                                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                    <Heart
                                        className={`h-4 w-4 transition-colors ${
                                            isFavorite ? 'fill-red-500 text-red-500' : ''
                                        }`}
                                    />
                                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-slate-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap dark:bg-slate-700">
                                        {isFavorite ? 'Saved' : 'Save'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 border-b pb-6 dark:border-slate-800">
                            {property.rooms && (
                                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                                    <BedDouble className="h-4 w-4" />
                                    {property.rooms}
                                </div>
                            )}
                            {property.area_usable && (
                                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                                    <Ruler className="h-4 w-4" />
                                    {property.area_usable} m²
                                </div>
                            )}
                            {property.floor && (
                                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                                    <Building className="h-4 w-4" />
                                    Floor {property.floor}{property.floors_total ? ` of ${property.floors_total}` : ''}
                                </div>
                            )}
                        </div>

                        {property.description && (
                            <div>
                                <h2 className="text-xl font-semibold mb-3">Description</h2>
                                <p className="text-slate-600 leading-relaxed dark:text-slate-400">
                                    {property.description}
                                </p>
                            </div>
                        )}

                        {features.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold mb-3">Features</h2>
                                <div className="flex flex-wrap gap-2">
                                    {features.map(feature => (
                                        <span key={feature} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {feature}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {property.url && (
                            <div className="pt-4">
                                <a
                                    href={property.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    View original listing
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <div className="mb-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Asking Price</p>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-primary dark:text-primary">
                                    {property.price
                                        ? new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(property.price)
                                        : 'Price on request'
                                    }
                                </span>
                            </div>
                            {property.area_usable && property.price && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(property.price / property.area_usable)} / m²
                                </p>
                            )}
                        </div>

                        <div className="space-y-4 border-t pt-4 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">AI Assessment</span>
                                <PriceIndicator assessment={assessment} />
                            </div>
                            {property.predicted_price && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Predicted Value</span>
                                    <span className="font-medium text-slate-900 dark:text-slate-50">
                                        {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(property.predicted_price)}
                                    </span>
                                </div>
                            )}
                            {property.price_deviation_percent !== null && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Deviation</span>
                                    <span className={`font-medium ${property.price_deviation_percent < 0 ? 'text-green-600 dark:text-green-400' : property.price_deviation_percent > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {property.price_deviation_percent > 0 ? '+' : ''}{property.price_deviation_percent.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleContactSeller}
                            disabled={!property.url}
                            className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed dark:disabled:bg-slate-700 flex items-center justify-center gap-2"
                        >
                            {property.url ? (
                                <>
                                    View Original Listing
                                    <ExternalLink className="h-4 w-4" />
                                </>
                            ) : (
                                'Contact Not Available'
                            )}
                        </button>
                    </div>

                    <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-50">Price History</h3>
                        <PriceTrendChart />
                    </div>
                </div>
            </div>
        </div>
    );
}
