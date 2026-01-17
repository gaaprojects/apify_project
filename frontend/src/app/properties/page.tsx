import { PropertyCard } from "@/components/PropertyCard";
import { Search } from "lucide-react";

// Mock data
const properties = [
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
    {
        id: 4,
        title: "Cozy Studio in Žižkov",
        price: 4200000,
        location: "Prague 3 - Žižkov",
        rooms: "1+kk",
        area: 30,
        imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800",
        assessment: "below_market" as const,
    },
    {
        id: 5,
        title: "Modern Loft in Holešovice",
        price: 9800000,
        location: "Prague 7 - Holešovice",
        rooms: "2+kk",
        area: 72,
        imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800",
        assessment: "at_market" as const,
    },
    {
        id: 6,
        title: "Renovated flat near Park",
        price: 6500000,
        location: "Prague 10 - Vršovice",
        rooms: "2+1",
        area: 60,
        imageUrl: "https://images.unsplash.com/photo-1484154218962-a1c00207bf9a?auto=format&fit=crop&q=80&w=800",
        assessment: "above_market" as const,
    },
];

export default function PropertiesPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Properties</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search location..."
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 md:w-64"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Filters Sidebar - Placeholder for now */}
                <div className="hidden lg:block space-y-6">
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <h3 className="font-semibold mb-4">Filters</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Price Range</label>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Min" className="w-full rounded px-2 py-1 border text-sm dark:bg-slate-800 dark:border-slate-700" />
                                    <input type="number" placeholder="Max" className="w-full rounded px-2 py-1 border text-sm dark:bg-slate-800 dark:border-slate-700" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Rooms</label>
                                <select className="w-full rounded px-2 py-1 border text-sm dark:bg-slate-800 dark:border-slate-700">
                                    <option>Any</option>
                                    <option>1+kk</option>
                                    <option>2+kk</option>
                                    <option>3+kk</option>
                                </select>
                            </div>
                            <button className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700">
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Property Grid */}
                <div className="lg:col-span-3">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {properties.map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
