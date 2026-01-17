import dynamic from "next/dynamic";

// Dynamically import PropertyMap to avoid SSR issues with Leaflet
const PropertyMap = dynamic(() => import("@/components/PropertyMap"), {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-6rem)] w-full animate-pulse bg-slate-100 dark:bg-slate-800" />,
});

const properties = [
    {
        id: 1,
        title: "Apartment in Karlín",
        price: 8500000,
        area: 55,
        location: "Prague 8",
        rooms: "2+kk",
        assessment: "below_market" as const,
        coordinates: [50.0919, 14.4542] as [number, number],
    },
    {
        id: 2,
        title: "House in Prague-West",
        price: 15900000,
        area: 180,
        location: "Prague-West",
        rooms: "5+1",
        assessment: "at_market" as const,
        coordinates: [50.0519, 14.3542] as [number, number],
    },
    {
        id: 3,
        title: "Luxury Penthouse",
        price: 25000000,
        area: 120,
        location: "Prague 1",
        rooms: "4+kk",
        assessment: "above_market" as const,
        coordinates: [50.0880, 14.4208] as [number, number],
    },
];

export default function MapPage() {
    return (
        <div className="h-[calc(100vh-6rem)] w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <PropertyMap properties={properties} />
        </div>
    );
}
