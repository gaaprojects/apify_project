"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { PropertyCard } from "./PropertyCard";

// Fix Leaflet icon issue
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface Property {
    id: number;
    title: string;
    price: number;
    location: string;
    rooms: string;
    area: number;
    imageUrl?: string;
    assessment: "below_market" | "at_market" | "above_market";
    coordinates: [number, number];
}

interface PropertyMapProps {
    properties: Property[];
}

export default function PropertyMap({ properties }: PropertyMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className="h-[600px] w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        );
    }

    const center = properties.length > 0 ? properties[0].coordinates : [50.0755, 14.4378] as [number, number]; // Default to Prague

    return (
        <div className="h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {properties.map((property) => (
                    <Marker
                        key={property.id}
                        position={property.coordinates}
                        icon={icon}
                    >
                        <Popup className="min-w-[300px]">
                            <div className="p-1">
                                <PropertyCard property={property} className="shadow-none border-0" />
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
