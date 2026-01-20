/**
 * Shared property types and utilities
 */

export interface ApiProperty {
    id: number;
    title: string | null;
    price: number | null;
    address_city: string | null;
    address_district: string | null;
    address_street: string | null;
    rooms: string | null;
    area_usable: number | null;
    main_image_url: string | null;
    price_assessment: string | null;
}

export interface Property {
    id: number;
    title: string;
    price: number;
    location: string;
    rooms: string;
    area: number;
    imageUrl?: string;
    assessment: "below_market" | "at_market" | "above_market";
}

/**
 * Maps an API property response to the frontend Property format
 */
export function mapApiPropertyToCard(apiProp: ApiProperty): Property {
    // Build location string (district first for Prague)
    const locationParts = [
        apiProp.address_district,
        apiProp.address_city
    ].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : 'Prague';

    // Build title
    const title = apiProp.title || 'Property Listing';

    // Get price or default to 0
    const price = apiProp.price ? Number(apiProp.price) : 0;

    // Get area or default to 0
    const area = apiProp.area_usable ? Number(apiProp.area_usable) : 0;

    // Get rooms or default
    const rooms = apiProp.rooms || 'N/A';

    // Get assessment or default to "at_market"
    const assessment = (apiProp.price_assessment || 'at_market') as "below_market" | "at_market" | "above_market";

    return {
        id: apiProp.id,
        title,
        price,
        location,
        rooms,
        area,
        imageUrl: apiProp.main_image_url || undefined,
        assessment,
    };
}

/**
 * Formats a price value in Czech Koruna
 */
export function formatPrice(price: number, options?: { compact?: boolean }): string {
    if (options?.compact && price >= 1000000) {
        return `${(price / 1000000).toFixed(1)}M CZK`;
    }
    return new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0
    }).format(price);
}

/**
 * Formats price per square meter
 */
export function formatPricePerSqm(price: number, area: number): string {
    if (!area || area === 0) return 'N/A';
    const pricePerSqm = price / area;
    return new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0
    }).format(pricePerSqm) + '/m²';
}

/**
 * Get assessment label text
 */
export function getAssessmentLabel(assessment: string): string {
    const labels: Record<string, string> = {
        below_market: 'Below Market',
        at_market: 'Fair Price',
        above_market: 'Above Market',
    };
    return labels[assessment] || 'Unknown';
}

/**
 * Get assessment color classes
 */
export function getAssessmentClasses(assessment: string): string {
    const classes: Record<string, string> = {
        below_market: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        at_market: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        above_market: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return classes[assessment] || classes.at_market;
}
