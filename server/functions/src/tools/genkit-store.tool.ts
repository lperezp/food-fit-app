import { z } from 'genkit/beta';
import { ai } from '../config/genkit';

const productItemSchema = z.object({
    productId: z.string(),
    name: z.string(),
    brand: z.string(),
    category: z.string(),
    store: z.string(),
    presentation: z.string().optional(),
    regularPrice: z.string().optional(),
    finalPrice: z.string().optional(),
    discountBadge: z.string().optional(),
    priceUnitLabel: z.string().optional(),
    availableUnits: z.number().optional(),
    imageUrl: z.string().optional(),
});

let recentToolProducts: Array<z.infer<typeof productItemSchema>> = [];

export function clearRecentToolProducts(): void {
    recentToolProducts = [];
}

export function consumeRecentToolProducts(): Array<z.infer<typeof productItemSchema>> {
    const items = [...recentToolProducts];
    recentToolProducts = [];
    return items;
}

function formatPresentation(quantity?: number, unit?: string): { presentation?: string; priceUnitLabel?: string } {
    if (!unit) return {};
    const upperUnit = unit.toUpperCase();
    const qty = quantity ?? 1;

    switch (upperUnit) {
        case 'KILOGRAM':
            return {
                presentation: `Presentación: ${qty}kg`,
                priceUnitLabel: 'Precio por kg',
            };
        case 'GRAM':
            return {
                presentation: `Presentación: ${qty}gr`,
            };
        case 'LITER':
            return {
                presentation: `Presentación: ${qty}lt`,
                priceUnitLabel: 'Precio por litro',
            };
        case 'MILLILITER':
            return {
                presentation: `Presentación: ${qty}ml`,
            };
        default:
            return {};
    }
}

export const getAvailableProductsTool = ai.defineTool(
    {
        name: 'getAvailableProducts',
        description: 'Busca un producto o ingrediente por su nombre (?q={name}) en el catálogo de Genkit Store. REGLA ESTRICTA: NUNCA llames a esta herramienta cuando recién estás sugiriendo una receta; SOLO debes usarla DESPUÉS de haberle preguntado al usuario si quiere buscar/comprar los productos en Genkit Store y que el usuario haya confirmado explícitamente que sí.',
        inputSchema: z.object({
            name: z.string().describe('Nombre del producto o ingrediente a buscar en Genkit Store (ej: "pollo", "arroz", "aceite", "atún", "espárragos"). Se envía como parámetro ?q={name}.'),
            page: z.number().optional().default(0).describe('Número de página (por defecto 0)'),
            size: z.number().optional().default(2).describe('Cantidad de productos por ingrediente (por defecto 2)'),
        }),
        outputSchema: z.object({
            storeName: z.string().describe('Nombre de la tienda consultada'),
            products: z.array(productItemSchema).describe('Lista de productos encontrados en el catálogo de Genkit Store con datos listos para renderizar en Card'),
            totalElements: z.number().describe('Total de productos encontrados'),
            message: z.string().describe('Resumen para el asistente'),
        }),
    },
    async ({ name, page = 0, size = 2 }) => {
        const apiUrl = process.env.GENKIT_STORE_API_URL || process.env.STORE_API_URL;
        const storeId = process.env.GENKIT_STORE_ID || process.env.STORE_ID;
        const storeName = process.env.GENKIT_STORE_NAME || process.env.STORE_NAME || 'Genkit Store';
        const authToken = process.env.GENKIT_STORE_AUTH_TOKEN || process.env.STORE_AUTH_TOKEN;
        const sessionToken = process.env.GENKIT_STORE_SESSION_TOKEN || process.env.STORE_SESSION_TOKEN || authToken;

        if (!apiUrl || !storeId || !authToken) {
            return {
                storeName,
                products: [],
                totalElements: 0,
                message: 'Faltan variables de entorno (GENKIT_STORE_API_URL, GENKIT_STORE_ID o GENKIT_STORE_AUTH_TOKEN) para consultar Genkit Store.',
            };
        }

        const headers = {
            'X-Application': 'BACKOFFICE',
            'X-Platform': 'WEB',
            'X-Store-Id': storeId,
            'Authorization': `Bearer ${authToken}`,
            'x-session-token': sessionToken || '',
        };

        try {
            const url = new URL(apiUrl);
            url.searchParams.set('q', name.trim());
            url.searchParams.set('page', String(page));
            url.searchParams.set('size', String(size));

            const response = await fetch(url.toString(), { method: 'GET', headers });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: any = await response.json();
            const rawItems: any[] = data?.items ?? [];

            const mappedProducts = rawItems.map((item) => {
                const firstSku = item.skus?.[0];
                const prices: Array<{ type: string; value: number; percentage?: number }> =
                    firstSku?.seller?.prices ?? [];

                const regularObj = prices.find((p) => p.type === 'REGULAR');
                const promoGeneralObj = prices.find((p) => p.type === 'PROMOTIONAL_GENERAL');
                const regularVal = regularObj?.value ?? prices[0]?.value;
                const finalVal = promoGeneralObj?.value ?? regularVal;

                const hasDiscount =
                    typeof regularVal === 'number' &&
                    typeof finalVal === 'number' &&
                    regularVal > finalVal;

                const discountPercent = hasDiscount
                    ? Math.max(1, Math.round(((regularVal - finalVal) / regularVal) * 100))
                    : undefined;

                const { presentation, priceUnitLabel } = formatPresentation(
                    firstSku?.stockManagement?.quantity,
                    firstSku?.stockManagement?.unit
                );

                return {
                    productId: String(item.productId || ''),
                    name: String(item.name || ''),
                    brand: String(item.brand?.name || '').toUpperCase(),
                    category: String(item.category?.name || ''),
                    store: storeName,
                    presentation,
                    regularPrice: hasDiscount ? `S/ ${regularVal.toFixed(2)}` : undefined,
                    finalPrice: typeof finalVal === 'number' ? `S/ ${finalVal.toFixed(2)}` : undefined,
                    discountBadge: discountPercent ? `-${discountPercent}%` : undefined,
                    priceUnitLabel,
                    availableUnits: firstSku?.seller?.availableUnits,
                    imageUrl: firstSku?.images?.[0]?.url || undefined,
                };
            });

            for (const prod of mappedProducts) {
                if (prod.productId && !recentToolProducts.some((p) => p.productId === prod.productId)) {
                    recentToolProducts.push(prod);
                }
            }

            return {
                storeName,
                products: mappedProducts,
                totalElements: data?.page?.totalElements ?? mappedProducts.length,
                message: mappedProducts.length > 0
                    ? `En ${storeName} se encontraron ${mappedProducts.length} resultados para "${name}": ${mappedProducts.map(p => `${p.name} (${p.brand}) - ${p.finalPrice ?? ''}`).join(', ')}`
                    : `No se encontraron productos para "${name}" en ${storeName}.`,
            };
        } catch (error: any) {
            console.warn(`[getAvailableProducts] Error consultando el catálogo de ${storeName}:`, error.message);
            return {
                storeName,
                products: [],
                totalElements: 0,
                message: `No se pudo consultar el catálogo de ${storeName}: ${error.message}`,
            };
        }
    }
);
