import { Actor } from 'apify';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import {
    RATE_LIMITS,
    API_ENDPOINTS,
    CadastralData,
    EnrichmentInput,
    RateLimiter,
    updateCadastralData,
    getPropertiesWithoutCadastral,
    sleep,
} from '../../shared/src';

const CUZK_WFS_URL = API_ENDPOINTS.cuzkWfs;

interface WfsFeature {
    'cp:CadastralParcel'?: {
        'cp:inspireId'?: {
            'base:localId'?: string;
        };
        'cp:nationalCadastralReference'?: string;
        'cp:areaValue'?: number;
    };
}

/**
 * Build WFS GetFeature request for cadastral parcels at a point
 */
function buildWfsRequest(lat: number, lng: number, buffer: number = 50): string {
    const minX = lng - buffer / 111320;
    const maxX = lng + buffer / 111320;
    const minY = lat - buffer / 110540;
    const maxY = lat + buffer / 110540;

    const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'cp:CadastralParcel',
        srsName: 'EPSG:4326',
        bbox: `${minY},${minX},${maxY},${maxX},EPSG:4326`,
        count: '5',
    });

    return `${CUZK_WFS_URL}?${params}`;
}

/**
 * Parse WFS response and extract cadastral data
 */
function parseWfsResponse(xmlData: string): CadastralData | null {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
    });

    try {
        const result = parser.parse(xmlData);

        // Navigate to feature collection
        const featureCollection = result['wfs:FeatureCollection'] || result['FeatureCollection'];
        if (!featureCollection) return null;

        const members = featureCollection['wfs:member'] || featureCollection['member'];
        if (!members) return null;

        // Get first feature
        const features = Array.isArray(members) ? members : [members];
        const firstFeature = features[0];

        if (!firstFeature) return null;

        const parcel = firstFeature['cp:CadastralParcel'];
        if (!parcel) return null;

        const localId = parcel['cp:inspireId']?.['base:localId'] || '';
        const nationalRef = parcel['cp:nationalCadastralReference'] || '';

        // Parse cadastral number from national reference
        // Format: CZ.[ku_code].[parcel_number]
        const refParts = nationalRef.split('.');
        const cadastralNumber = refParts.length >= 3 ? refParts[2] : localId;

        return {
            cadastral_number: cadastralNumber,
            cadastral_area: refParts.length >= 2 ? refParts[1] : undefined,
            ownership_type: undefined,  // Would need additional API call
            liens_count: 0,             // Would need additional API call
        };
    } catch (error) {
        console.error('Error parsing WFS response:', error);
        return null;
    }
}

/**
 * Fetch cadastral data for a point
 */
async function fetchCadastralData(lat: number, lng: number): Promise<CadastralData | null> {
    try {
        const url = buildWfsRequest(lat, lng);

        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/xml',
            },
            timeout: 30000,
        });

        if (response.status === 200 && response.data) {
            return parseWfsResponse(response.data);
        }

        return null;
    } catch (error) {
        console.error(`Error fetching cadastral data for (${lat}, ${lng}):`, error);
        return null;
    }
}

/**
 * Alternative: Use RUIAN REST API for more detailed data
 * This endpoint provides address points and building info
 */
async function fetchFromRuian(lat: number, lng: number): Promise<CadastralData | null> {
    try {
        // RUIAN geocoding service
        const url = `https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/identify`;

        const params = new URLSearchParams({
            f: 'json',
            geometry: JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
            geometryType: 'esriGeometryPoint',
            tolerance: '10',
            mapExtent: `${lng - 0.001},${lat - 0.001},${lng + 0.001},${lat + 0.001}`,
            imageDisplay: '400,400,96',
            layers: 'all',
            returnGeometry: 'false',
        });

        const response = await axios.get(`${url}?${params}`, {
            timeout: 30000,
        });

        if (response.status === 200 && response.data?.results?.length > 0) {
            const result = response.data.results[0];
            const attributes = result.attributes || {};

            return {
                cadastral_number: attributes.PARCELA || attributes.CISLO_PARCELY,
                cadastral_area: attributes.KU_NAZEV || attributes.KATASTRALNI_UZEMI,
                ownership_type: attributes.DRUH_VLASTNICTVI,
            };
        }

        return null;
    } catch (error) {
        // RUIAN might not be available, fall back to WFS
        return null;
    }
}

async function main() {
    await Actor.init();

    const input = await Actor.getInput<EnrichmentInput>() || {};

    const rateLimiter = new RateLimiter(RATE_LIMITS.cuzk.requestsPerMinute);
    let enriched = 0;
    let failed = 0;

    console.log('Starting CUZK cadastral data fetcher');

    // Get properties that need enrichment
    let properties: Array<{ id: number; lat: number; lng: number }>;

    if (input.propertyIds && input.propertyIds.length > 0) {
        // Specific properties requested
        // Would need to fetch their coordinates
        console.log(`Processing ${input.propertyIds.length} specific properties`);
        properties = []; // Would fetch from API
    } else if (input.coordinates && input.coordinates.length > 0) {
        // Direct coordinates provided (for testing)
        properties = input.coordinates.map((c, i) => ({
            id: i,
            lat: c.lat,
            lng: c.lng,
        }));
    } else {
        // Fetch properties without cadastral data from backend
        console.log('Fetching properties without cadastral data...');
        properties = await getPropertiesWithoutCadastral(100);
    }

    console.log(`Processing ${properties.length} properties`);

    for (const prop of properties) {
        await rateLimiter.wait();

        try {
            console.log(`Fetching cadastral data for property ${prop.id} at (${prop.lat}, ${prop.lng})`);

            // Try RUIAN first (more detailed), fall back to WFS
            let cadastralData = await fetchFromRuian(prop.lat, prop.lng);

            if (!cadastralData) {
                cadastralData = await fetchCadastralData(prop.lat, prop.lng);
            }

            if (cadastralData) {
                // Update property in backend
                await updateCadastralData(prop.id, cadastralData);

                // Push to dataset
                await Actor.pushData({
                    property_id: prop.id,
                    ...cadastralData,
                });

                enriched++;
                console.log(`Enriched property ${prop.id}: ${cadastralData.cadastral_number}`);
            } else {
                failed++;
                console.warn(`No cadastral data found for property ${prop.id}`);
            }
        } catch (error) {
            failed++;
            console.error(`Error processing property ${prop.id}:`, error);
        }

        // Progress update
        if ((enriched + failed) % 10 === 0) {
            console.log(`Progress: ${enriched} enriched, ${failed} failed`);
        }
    }

    console.log(`\nEnrichment complete:`);
    console.log(`  - Enriched: ${enriched}`);
    console.log(`  - Failed: ${failed}`);

    await Actor.exit();
}

main();
