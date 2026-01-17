import { Actor } from 'apify';
import axios from 'axios';
import {
    RATE_LIMITS,
    API_ENDPOINTS,
    SOURCES,
    CITIES,
    PropertyData,
    ScrapingInput,
    SrealityResponse,
    SrealityEstate,
    RateLimiter,
    extractFeatures,
    parseRoomsCount,
    extractCity,
    extractDistrict,
    saveProperty,
} from '../../shared/src';

const SREALITY_API = API_ENDPOINTS.sreality;

interface SrealityCategory {
    category_main_cb: number;  // 1 = apartment, 2 = house
    category_type_cb: number;  // 1 = sale, 2 = rent
}

const CATEGORY_MAP: Record<string, SrealityCategory> = {
    'apartment_sale': { category_main_cb: 1, category_type_cb: 1 },
    'apartment_rent': { category_main_cb: 1, category_type_cb: 2 },
    'house_sale': { category_main_cb: 2, category_type_cb: 1 },
    'house_rent': { category_main_cb: 2, category_type_cb: 2 },
};

const LOCALITY_REGION_MAP: Record<string, number> = {
    'praha': 10,
    'jihomoravsky-kraj': 11,
    'moravskoslezsky-kraj': 12,
    'plzensky-kraj': 13,
};

async function fetchEstates(
    category: SrealityCategory,
    region: number,
    page: number,
    perPage: number = 60
): Promise<SrealityResponse> {
    const params = new URLSearchParams({
        category_main_cb: category.category_main_cb.toString(),
        category_type_cb: category.category_type_cb.toString(),
        locality_region_id: region.toString(),
        page: page.toString(),
        per_page: perPage.toString(),
        tms: Date.now().toString(),
    });

    const response = await axios.get<SrealityResponse>(`${SREALITY_API}?${params}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'cs,en;q=0.9',
        },
    });

    return response.data;
}

async function fetchEstateDetail(hashId: number): Promise<any> {
    const response = await axios.get(`${SREALITY_API}/${hashId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        },
    });

    return response.data;
}

function parseEstate(estate: SrealityEstate, propertyType: string, transactionType: string): PropertyData {
    const features = extractFeatures(estate.labelsAll || []);
    const images = estate._embedded?.images?.map(img => img._links.self.href) || [];

    // Parse name for room info (e.g., "Prodej bytu 2+kk 65 m²")
    const nameMatch = estate.name.match(/(\d\+(?:kk|1))/i);
    const rooms = nameMatch ? nameMatch[1] : undefined;

    // Parse area from name
    const areaMatch = estate.name.match(/(\d+)\s*m²/);
    const area = areaMatch ? parseInt(areaMatch[1], 10) : undefined;

    return {
        external_id: estate.hash_id.toString(),
        source: SOURCES.sreality,
        title: estate.name,
        property_type: propertyType as 'apartment' | 'house',
        transaction_type: transactionType as 'sale' | 'rent',
        price: estate.price_czk?.value_raw || estate.price,
        currency: 'CZK',
        area_usable: area,
        rooms: rooms,
        rooms_count: rooms ? parseRoomsCount(rooms) : undefined,
        address_city: extractCity(estate.locality),
        address_district: extractDistrict(estate.locality),
        lat: estate.gps?.lat,
        lng: estate.gps?.lon,
        images: images.slice(0, 10),
        main_image_url: images[0],
        url: `https://www.sreality.cz/detail/${estate.seo?.locality || 'nemovitost'}/${estate.hash_id}`,
        ...features,
    };
}

async function main() {
    await Actor.init();

    const input = await Actor.getInput<ScrapingInput>() || {};

    const {
        cities = CITIES.map(c => c.name),
        propertyTypes = ['apartment', 'house'],
        transactionTypes = ['sale'],
        maxProperties = 1000,
    } = input;

    const rateLimiter = new RateLimiter(RATE_LIMITS.sreality.requestsPerMinute);
    let totalScraped = 0;

    console.log(`Starting sreality.cz scraper`);
    console.log(`Cities: ${cities.join(', ')}`);
    console.log(`Property types: ${propertyTypes.join(', ')}`);
    console.log(`Transaction types: ${transactionTypes.join(', ')}`);
    console.log(`Max properties: ${maxProperties}`);

    for (const cityConfig of CITIES) {
        if (!cities.includes(cityConfig.name)) continue;

        const regionId = LOCALITY_REGION_MAP[cityConfig.region];
        if (!regionId) {
            console.warn(`Unknown region for city ${cityConfig.name}`);
            continue;
        }

        for (const propType of propertyTypes) {
            for (const transType of transactionTypes) {
                const categoryKey = `${propType}_${transType}`;
                const category = CATEGORY_MAP[categoryKey];

                if (!category) {
                    console.warn(`Unknown category: ${categoryKey}`);
                    continue;
                }

                console.log(`\nScraping ${categoryKey} in ${cityConfig.name}...`);

                let page = 1;
                let hasMore = true;

                while (hasMore && totalScraped < maxProperties) {
                    await rateLimiter.wait();

                    try {
                        const response = await fetchEstates(category, regionId, page);
                        const estates = response._embedded?.estates || [];

                        if (estates.length === 0) {
                            hasMore = false;
                            break;
                        }

                        for (const estate of estates) {
                            if (totalScraped >= maxProperties) break;

                            try {
                                // Optionally fetch detail for more info
                                // await rateLimiter.wait();
                                // const detail = await fetchEstateDetail(estate.hash_id);

                                const propertyData = parseEstate(estate, propType, transType);

                                // Save to backend
                                await saveProperty(propertyData);

                                // Also push to Apify dataset
                                await Actor.pushData(propertyData);

                                totalScraped++;

                                if (totalScraped % 50 === 0) {
                                    console.log(`Scraped ${totalScraped} properties...`);
                                }
                            } catch (error) {
                                console.error(`Error processing estate ${estate.hash_id}:`, error);
                            }
                        }

                        // Check if there are more pages
                        if (page * response.per_page >= response.result_size) {
                            hasMore = false;
                        } else {
                            page++;
                        }
                    } catch (error) {
                        console.error(`Error fetching page ${page}:`, error);
                        hasMore = false;
                    }
                }
            }
        }
    }

    console.log(`\nScraping complete. Total properties scraped: ${totalScraped}`);

    await Actor.exit();
}

main();
