// Rate limiting
export const RATE_LIMITS = {
    sreality: {
        requestsPerMinute: 30,
        delayMs: 2000, // 2 seconds between requests
    },
    bezrealitky: {
        requestsPerMinute: 20,
        delayMs: 3000, // 3 seconds between requests
    },
    cuzk: {
        requestsPerMinute: 10,
        delayMs: 6000, // 6 seconds between requests
    },
};

// Property types
export const PROPERTY_TYPES = {
    apartment: 'apartment',
    house: 'house',
} as const;

// Transaction types
export const TRANSACTION_TYPES = {
    sale: 'sale',
    rent: 'rent',
} as const;

// Room layouts in Czech
export const ROOM_LAYOUTS = [
    '1+kk', '1+1',
    '2+kk', '2+1',
    '3+kk', '3+1',
    '4+kk', '4+1',
    '5+kk', '5+1',
    '6+',
] as const;

// Condition mappings
export const CONDITION_MAP: Record<string, string> = {
    'Novostavba': 'new',
    'Velmi dobrý': 'good',
    'Dobrý': 'good',
    'Po rekonstrukci': 'renovated',
    'Před rekonstrukcí': 'to_renovate',
    'Špatný': 'to_renovate',
    'Ve výstavbě': 'construction',
    'Původní': 'original',
    'Nová budova': 'new',
    'new': 'new',
    'good': 'good',
    'renovated': 'renovated',
    'original': 'original',
    'to_renovate': 'to_renovate',
};

// Construction type mappings
export const CONSTRUCTION_TYPE_MAP: Record<string, string> = {
    'Cihlová': 'brick',
    'Panelová': 'panel',
    'Smíšená': 'mixed',
    'Skeletová': 'skeleton',
    'Dřevostavba': 'wood',
    'brick': 'brick',
    'panel': 'panel',
    'wood': 'wood',
};

// Cities to scrape
export const CITIES = [
    { name: 'Praha', region: 'praha' },
    { name: 'Brno', region: 'jihomoravsky-kraj' },
    { name: 'Ostrava', region: 'moravskoslezsky-kraj' },
    { name: 'Plzeň', region: 'plzensky-kraj' },
];

// API endpoints
export const API_ENDPOINTS = {
    sreality: 'https://www.sreality.cz/api/cs/v2/estates',
    bezrealitky: 'https://www.bezrealitky.cz',
    cuzkWfs: 'https://services.cuzk.cz/wfs/inspire-cp-wfs.asp',
    backend: process.env.BACKEND_URL || 'http://localhost:8000',
};

// Source identifiers
export const SOURCES = {
    sreality: 'sreality',
    bezrealitky: 'bezrealitky',
} as const;
