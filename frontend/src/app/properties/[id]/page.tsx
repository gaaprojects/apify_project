import Link from "next/link";
import { ArrowLeft, MapPin, BedDouble, Ruler, Calendar, Shield, Share2, Heart, Building } from "lucide-react";
import { PriceIndicator } from "@/components/PriceIndicator";
import { PriceTrendChart } from "@/components/PriceTrendChart"; // Reusing for now

// Mock data single property
const property = {
    id: 1,
    title: "Brand new apartment in Karlín with Terrace",
    price: 8500000,
    location: "Prague 8 - Karlín, Křižíkova",
    rooms: "2+kk",
    area: 55,
    floor: 3,
    description: "Beautiful modern apartment in the heart of Karlín. Walking distance to metro, cafes, and parks. The apartment features a spacious living room with kitchenette, separate bedroom, bathroom with tub, and a 10m² terrace facing the quiet courtyard.",
    features: ["Terrace", "Elevator", "Cellar", "Parking", "New Building"],
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1200",
    assessment: "below_market" as const,
    predictedPrice: 9200000,
    priceDeviation: -7.6,
};

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
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
                        <img
                            src={property.imageUrl}
                            alt={property.title}
                            className="h-full w-full object-cover"
                        />
                    </div>

                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{property.title}</h1>
                                <div className="mt-2 flex items-center text-slate-600 dark:text-slate-400">
                                    <MapPin className="mr-2 h-4 w-4" />
                                    {property.location}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="rounded-full border p-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                                    <Share2 className="h-4 w-4" />
                                </button>
                                <button className="rounded-full border p-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                                    <Heart className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 border-b pb-6 dark:border-slate-800">
                            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                                <BedDouble className="h-4 w-4" />
                                {property.rooms}
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                                <Ruler className="h-4 w-4" />
                                {property.area} m²
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                                <Building className="h-4 w-4" />
                                Floor {property.floor}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold mb-3">Description</h2>
                            <p className="text-slate-600 leading-relaxed dark:text-slate-400">
                                {property.description}
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold mb-3">Features</h2>
                            <div className="flex flex-wrap gap-2">
                                {property.features.map(feature => (
                                    <span key={feature} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        {feature}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <div className="mb-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Asking Price</p>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                    {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(property.price)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 border-t pt-4 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">AI Assessment</span>
                                <PriceIndicator assessment={property.assessment} />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Predicted Value</span>
                                <span className="font-medium text-slate-900 dark:text-slate-50">
                                    {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(property.predictedPrice)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Deviation</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                    {property.priceDeviation}%
                                </span>
                            </div>
                        </div>

                        <button className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
                            Contact Seller
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
