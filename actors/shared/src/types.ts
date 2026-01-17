export interface PropertyData {
    external_id: string;
    source: string;
    title: string;
    description?: string;
    property_type: 'apartment' | 'house';
    transaction_type: 'sale' | 'rent';
    price: number;
    currency: string;

    // Size
    area_usable?: number;
    area_built?: number;
    area_land?: number;
    rooms?: string;
    rooms_count?: number;
    floor?: number;
    floors_total?: number;

    // Features
    condition?: string;
    construction_type?: string;
    energy_rating?: string;
    has_balcony?: boolean;
    has_terrace?: boolean;
    has_parking?: boolean;
    has_garage?: boolean;
    has_elevator?: boolean;
    has_cellar?: boolean;
    has_garden?: boolean;

    // Location
    address_street?: string;
    address_city?: string;
    address_district?: string;
    address_zip?: string;
    lat?: number;
    lng?: number;

    // Media
    images?: string[];
    main_image_url?: string;

    // Source URL
    url: string;
}

export interface ScrapingInput {
    cities?: string[];
    propertyTypes?: ('apartment' | 'house')[];
    transactionTypes?: ('sale' | 'rent')[];
    maxProperties?: number;
    startUrls?: string[];
}

export interface CadastralData {
    cadastral_number?: string;
    cadastral_area?: string;
    ownership_type?: string;
    liens_count?: number;
    encumbrances?: string;
    historical_prices?: HistoricalPrice[];
}

export interface HistoricalPrice {
    date: string;
    price: number;
    price_per_sqm?: number;
}

export interface EnrichmentInput {
    propertyIds?: number[];
    coordinates?: { lat: number; lng: number }[];
}

export interface SrealityEstate {
    hash_id: number;
    name: string;
    locality: string;
    price: number;
    price_czk: {
        value_raw: number;
        unit: string;
    };
    gps: {
        lat: number;
        lon: number;
    };
    labelsAll: string[];
    seo: {
        locality: string;
    };
    _embedded?: {
        images?: Array<{
            _links: {
                self: { href: string };
            };
        }>;
    };
}

export interface SrealityResponse {
    _embedded: {
        estates: SrealityEstate[];
    };
    page: number;
    per_page: number;
    result_size: number;
}

export interface BezrealitkyProperty {
    id: string;
    uri: string;
    title: string;
    mainImage?: string;
    price?: number;
    surface?: number;
    disposition?: string;
    address?: {
        street?: string;
        city?: string;
        district?: string;
        zip?: string;
    };
    gps?: {
        lat: number;
        lng: number;
    };
    features?: string[];
}
