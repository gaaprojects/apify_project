import { Actor } from 'apify';
import { PlaywrightCrawler, createPlaywrightRouter } from 'crawlee';
import {
    RATE_LIMITS,
    API_ENDPOINTS,
    SOURCES,
    CITIES,
    PropertyData,
    ScrapingInput,
    BezrealitkyProperty,
    RateLimiter,
    extractFeatures,
    parseRoomsCount,
    parsePrice,
    parseArea,
    saveProperty,
    sleep,
} from '../../shared/src';

const BASE_URL = API_ENDPOINTS.bezrealitky;

interface NextDataProps {
    pageProps?: {
        listings?: BezrealitkyProperty[];
        listing?: BezrealitkyProperty;
    };
}

function buildSearchUrl(city: string, propertyType: string, transactionType: string, page: number = 1): string {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const typeSlug = propertyType === 'apartment' ? 'byt' : 'dum';
    const transSlug = transactionType === 'sale' ? 'prodej' : 'pronajem';

    return `${BASE_URL}/${transSlug}/${typeSlug}/${citySlug}?page=${page}`;
}

function parseListingFromNextData(data: BezrealitkyProperty, propertyType: string, transactionType: string): PropertyData {
    const features = extractFeatures(data.features || []);

    return {
        external_id: data.id,
        source: SOURCES.bezrealitky,
        title: data.title,
        property_type: propertyType as 'apartment' | 'house',
        transaction_type: transactionType as 'sale' | 'rent',
        price: data.price || 0,
        currency: 'CZK',
        area_usable: data.surface,
        rooms: data.disposition,
        rooms_count: data.disposition ? parseRoomsCount(data.disposition) : undefined,
        address_street: data.address?.street,
        address_city: data.address?.city,
        address_district: data.address?.district,
        address_zip: data.address?.zip,
        lat: data.gps?.lat,
        lng: data.gps?.lng,
        images: data.mainImage ? [data.mainImage] : [],
        main_image_url: data.mainImage,
        url: `${BASE_URL}${data.uri}`,
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
        maxProperties = 500,
    } = input;

    const rateLimiter = new RateLimiter(RATE_LIMITS.bezrealitky.requestsPerMinute);
    let totalScraped = 0;

    console.log(`Starting bezrealitky.cz scraper`);
    console.log(`Cities: ${cities.join(', ')}`);
    console.log(`Max properties: ${maxProperties}`);

    // Build list of URLs to scrape
    const startUrls: string[] = [];

    for (const city of cities) {
        for (const propType of propertyTypes) {
            for (const transType of transactionTypes) {
                startUrls.push(buildSearchUrl(city, propType, transType));
            }
        }
    }

    const router = createPlaywrightRouter();

    // Handle listing pages
    router.addDefaultHandler(async ({ page, request, enqueueLinks, log }) => {
        if (totalScraped >= maxProperties) {
            log.info('Max properties reached, stopping...');
            return;
        }

        await rateLimiter.wait();

        log.info(`Processing: ${request.url}`);

        // Wait for page to load
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

        // Extract __NEXT_DATA__ from script tag
        const nextDataScript = await page.$('script#__NEXT_DATA__');

        if (nextDataScript) {
            const nextDataText = await nextDataScript.textContent();

            if (nextDataText) {
                try {
                    const nextData = JSON.parse(nextDataText) as { props: NextDataProps };
                    const listings = nextData.props?.pageProps?.listings || [];

                    // Determine property type and transaction type from URL
                    const url = request.url;
                    const propertyType = url.includes('/byt') ? 'apartment' : 'house';
                    const transactionType = url.includes('/prodej') ? 'sale' : 'rent';

                    for (const listing of listings) {
                        if (totalScraped >= maxProperties) break;

                        try {
                            const propertyData = parseListingFromNextData(listing, propertyType, transactionType);

                            // Save to backend
                            await saveProperty(propertyData);

                            // Also push to Apify dataset
                            await Actor.pushData(propertyData);

                            totalScraped++;

                            if (totalScraped % 25 === 0) {
                                log.info(`Scraped ${totalScraped} properties...`);
                            }
                        } catch (error) {
                            log.error(`Error processing listing ${listing.id}: ${error}`);
                        }
                    }

                    // Check for next page
                    if (listings.length > 0 && totalScraped < maxProperties) {
                        const currentUrl = new URL(request.url);
                        const currentPage = parseInt(currentUrl.searchParams.get('page') || '1', 10);
                        currentUrl.searchParams.set('page', (currentPage + 1).toString());

                        await enqueueLinks({
                            urls: [currentUrl.toString()],
                            label: 'listing',
                        });
                    }
                } catch (error) {
                    log.error(`Error parsing __NEXT_DATA__: ${error}`);
                }
            }
        } else {
            // Fallback: scrape from DOM
            log.info('__NEXT_DATA__ not found, scraping from DOM...');

            const propertyCards = await page.$$('[data-testid="property-card"], .property-card, article.listing');

            for (const card of propertyCards) {
                if (totalScraped >= maxProperties) break;

                try {
                    const title = await card.$eval('h2, .title', el => el.textContent?.trim() || '').catch(() => '');
                    const priceText = await card.$eval('.price, [data-testid="price"]', el => el.textContent?.trim() || '').catch(() => '');
                    const areaText = await card.$eval('.area, [data-testid="area"]', el => el.textContent?.trim() || '').catch(() => '');
                    const link = await card.$eval('a', el => el.getAttribute('href') || '').catch(() => '');
                    const imageUrl = await card.$eval('img', el => el.getAttribute('src') || '').catch(() => '');

                    if (!title || !link) continue;

                    const propertyType = request.url.includes('/byt') ? 'apartment' : 'house';
                    const transactionType = request.url.includes('/prodej') ? 'sale' : 'rent';

                    const propertyData: PropertyData = {
                        external_id: link.split('/').pop() || `br-${Date.now()}-${totalScraped}`,
                        source: SOURCES.bezrealitky,
                        title,
                        property_type: propertyType as 'apartment' | 'house',
                        transaction_type: transactionType as 'sale' | 'rent',
                        price: parsePrice(priceText) || 0,
                        currency: 'CZK',
                        area_usable: parseArea(areaText),
                        main_image_url: imageUrl,
                        url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    };

                    await saveProperty(propertyData);
                    await Actor.pushData(propertyData);
                    totalScraped++;
                } catch (error) {
                    log.error(`Error processing card: ${error}`);
                }
            }
        }
    });

    const crawler = new PlaywrightCrawler({
        requestHandler: router,
        maxConcurrency: 1,  // Respect rate limits
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 30,
        headless: true,
        launchContext: {
            launchOptions: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        },
    });

    await crawler.run(startUrls);

    console.log(`\nScraping complete. Total properties scraped: ${totalScraped}`);

    await Actor.exit();
}

main();
