import Link from "next/link";
import { MapPin, BedDouble, Ruler } from "lucide-react";
import { PriceIndicator } from "./PriceIndicator";
import { cn } from "@/lib/utils";

interface Property {
    id: number;
    title: string;
    price: number;
    location: string;
    rooms: string;
    area: number;
    imageUrl?: string;
    assessment: "below_market" | "at_market" | "above_market";
}

interface PropertyCardProps {
    property: Property;
    className?: string;
}

export function PropertyCard({ property, className }: PropertyCardProps) {
    return (
        <Link href={`/properties/${property.id}`}>
            <div className={cn("group overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-900 dark:border-slate-800", className)}>
                <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {property.imageUrl ? (
                        <img
                            src={property.imageUrl}
                            alt={property.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                            No Image
                        </div>
                    )}
                </div>
                <div className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                        <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                            {property.title}
                        </h3>
                    </div>
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(property.price)}
                        </span>
                        <PriceIndicator assessment={property.assessment} />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{property.location}</span>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 border-t pt-4 text-sm text-slate-600 dark:text-slate-300 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                            <BedDouble className="h-4 w-4" />
                            <span>{property.rooms}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Ruler className="h-4 w-4" />
                            <span>{property.area} m²</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
