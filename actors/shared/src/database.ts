import { API_ENDPOINTS } from './constants';
import { PropertyData, CadastralData } from './types';

const BACKEND_URL = API_ENDPOINTS.backend;

export async function saveProperty(property: PropertyData): Promise<void> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/properties`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(property),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`Failed to save property ${property.external_id}: ${error}`);
        }
    } catch (error) {
        console.error(`Error saving property ${property.external_id}:`, error);
        throw error;
    }
}

export async function saveProperties(properties: PropertyData[]): Promise<{
    saved: number;
    failed: number;
}> {
    let saved = 0;
    let failed = 0;

    for (const property of properties) {
        try {
            await saveProperty(property);
            saved++;
        } catch {
            failed++;
        }
    }

    return { saved, failed };
}

export async function updateCadastralData(
    propertyId: number,
    cadastralData: CadastralData
): Promise<void> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/properties/${propertyId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cadastralData),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`Failed to update cadastral data for ${propertyId}: ${error}`);
        }
    } catch (error) {
        console.error(`Error updating cadastral data for ${propertyId}:`, error);
        throw error;
    }
}

export async function getPropertiesWithoutCadastral(limit: number = 100): Promise<Array<{
    id: number;
    lat: number;
    lng: number;
}>> {
    try {
        const response = await fetch(
            `${BACKEND_URL}/api/v1/properties?page_size=${limit}&cadastral_number=null`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch properties: ${response.statusText}`);
        }

        const data = await response.json();
        return data.items
            .filter((p: any) => p.coordinates)
            .map((p: any) => ({
                id: p.id,
                lat: p.coordinates.lat,
                lng: p.coordinates.lng,
            }));
    } catch (error) {
        console.error('Error fetching properties:', error);
        return [];
    }
}
