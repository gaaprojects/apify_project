import { CONDITION_MAP, CONSTRUCTION_TYPE_MAP } from './constants';

/**
 * Parse room layout string to numeric value
 * e.g., "2+kk" -> 2.0, "3+1" -> 3.0
 */
export function parseRoomsCount(rooms: string): number | undefined {
    if (!rooms) return undefined;

    const match = rooms.match(/^(\d+)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return undefined;
}

/**
 * Normalize condition string to standard values
 */
export function normalizeCondition(condition: string | undefined): string | undefined {
    if (!condition) return undefined;
    return CONDITION_MAP[condition] || condition.toLowerCase();
}

/**
 * Normalize construction type string
 */
export function normalizeConstructionType(type: string | undefined): string | undefined {
    if (!type) return undefined;
    return CONSTRUCTION_TYPE_MAP[type] || type.toLowerCase();
}

/**
 * Parse Czech price string to number
 * e.g., "5 000 000 Kč" -> 5000000
 */
export function parsePrice(priceStr: string): number | undefined {
    if (!priceStr) return undefined;

    // Remove currency and spaces
    const cleaned = priceStr
        .replace(/\s/g, '')
        .replace(/Kč/gi, '')
        .replace(/CZK/gi, '')
        .replace(/,-/g, '');

    const num = parseInt(cleaned, 10);
    return isNaN(num) ? undefined : num;
}

/**
 * Parse area string to number
 * e.g., "65 m²" -> 65
 */
export function parseArea(areaStr: string): number | undefined {
    if (!areaStr) return undefined;

    const match = areaStr.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
        return parseFloat(match[1].replace(',', '.'));
    }
    return undefined;
}

/**
 * Extract features from labels/tags
 */
export function extractFeatures(labels: string[]): {
    has_balcony: boolean;
    has_terrace: boolean;
    has_parking: boolean;
    has_garage: boolean;
    has_elevator: boolean;
    has_cellar: boolean;
    has_garden: boolean;
    condition?: string;
    construction_type?: string;
} {
    const labelsLower = labels.map(l => l.toLowerCase());

    return {
        has_balcony: labelsLower.some(l => l.includes('balkon') || l.includes('balkón') || l.includes('balcony')),
        has_terrace: labelsLower.some(l => l.includes('terasa') || l.includes('terrace')),
        has_parking: labelsLower.some(l => l.includes('parkov') || l.includes('parking')),
        has_garage: labelsLower.some(l => l.includes('garáž') || l.includes('garage')),
        has_elevator: labelsLower.some(l => l.includes('výtah') || l.includes('elevator')),
        has_cellar: labelsLower.some(l => l.includes('sklep') || l.includes('cellar')),
        has_garden: labelsLower.some(l => l.includes('zahrad') || l.includes('garden')),
        condition: labels.find(l => CONDITION_MAP[l]) ? normalizeCondition(labels.find(l => CONDITION_MAP[l])) : undefined,
        construction_type: labels.find(l => CONSTRUCTION_TYPE_MAP[l]) ? normalizeConstructionType(labels.find(l => CONSTRUCTION_TYPE_MAP[l])) : undefined,
    };
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limiter class
 */
export class RateLimiter {
    private lastRequestTime: number = 0;
    private minDelayMs: number;

    constructor(requestsPerMinute: number) {
        this.minDelayMs = Math.ceil(60000 / requestsPerMinute);
    }

    async wait(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        const waitTime = Math.max(0, this.minDelayMs - elapsed);

        if (waitTime > 0) {
            await sleep(waitTime);
        }

        this.lastRequestTime = Date.now();
    }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            console.warn(`Attempt ${attempt + 1} failed: ${lastError.message}`);

            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Extract city from locality string
 */
export function extractCity(locality: string): string | undefined {
    if (!locality) return undefined;

    // Common patterns
    const cities = ['Praha', 'Brno', 'Ostrava', 'Plzeň'];

    for (const city of cities) {
        if (locality.includes(city)) {
            return city;
        }
    }

    // Try to extract from "City - District" pattern
    const parts = locality.split(',');
    if (parts.length > 0) {
        return parts[parts.length - 1].trim().split(' ')[0];
    }

    return undefined;
}

/**
 * Extract district from locality string
 */
export function extractDistrict(locality: string): string | undefined {
    if (!locality) return undefined;

    const parts = locality.split(',');
    if (parts.length >= 2) {
        return parts[0].trim();
    }

    // Try "City - District" pattern
    const dashParts = locality.split(' - ');
    if (dashParts.length >= 2) {
        return dashParts[1].trim();
    }

    return undefined;
}
