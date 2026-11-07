import { z } from 'genkit/beta';
import { ai } from '../config/genkit';
import { nutritionCoachAgent } from '../agents/nutrition-coach.agent';
import { clearRecentToolProducts, consumeRecentToolProducts } from '../tools/genkit-store.tool';

const userChatSessions = new Map<string, ReturnType<typeof nutritionCoachAgent.chat>>();

function extractProductsFromA2ui(envelopes: any[]): any[] {
    const extracted: any[] = [];
    for (const env of envelopes) {
        const components: any[] = env?.updateComponents?.components;
        if (!Array.isArray(components)) continue;

        const byId = new Map<string, any>();
        for (const comp of components) {
            if (comp?.id) byId.set(comp.id, comp);
        }

        const cards = components.filter((c) => c?.component === 'Card');
        for (const card of cards) {
            const col = byId.get(card.child);
            const childIds: string[] = Array.isArray(col?.children) ? col.children : [];
            const children = childIds.map((id) => byId.get(id)).filter(Boolean);

            const prod: any = {
                productId: card.id,
                name: '',
                brand: '',
                store: 'Genkit Store',
            };

            for (const item of children) {
                if (item.component === 'Image' && item.url) {
                    prod.imageUrl = item.url;
                } else if (item.component === 'Text' && typeof item.text === 'string') {
                    const txt = item.text.trim();
                    if (/^-\d+%$/.test(txt)) {
                        prod.discountBadge = txt;
                    } else if (txt.startsWith('Presentación:')) {
                        prod.presentation = txt;
                    } else if (txt.startsWith('Precio por')) {
                        prod.priceUnitLabel = txt;
                    } else if (txt.startsWith('S/')) {
                        if (item.variant === 'h3' || item.variant === 'h2' || String(item.id).toLowerCase().includes('final')) {
                            prod.finalPrice = txt;
                        } else if (!prod.regularPrice && prod.finalPrice) {
                            prod.regularPrice = txt;
                        } else if (!prod.regularPrice && String(item.id).toLowerCase().includes('reg')) {
                            prod.regularPrice = txt;
                        } else if (!prod.finalPrice) {
                            prod.finalPrice = txt;
                        }
                    } else if (item.variant === 'h4' || item.variant === 'h5' || String(item.id).toLowerCase().includes('title')) {
                        prod.name = txt;
                    } else if (!prod.brand && txt === txt.toUpperCase()) {
                        prod.brand = txt;
                    } else if (!prod.name) {
                        prod.name = txt;
                    }
                }
            }

            if (prod.name) {
                extracted.push(prod);
            }
        }
    }
    return extracted;
}

export const nutritionCoachFlow = ai.defineFlow(
    {
        name: 'nutritionCoachFlow',
        inputSchema: z.object({
            message: z.string().describe('Mensaje para el coach nutricional'),
            userId: z.string().optional().describe('ID opcional del usuario'),
        }),
    },
    async ({ message, userId }) => {
        const sessionKey = userId || 'anonymous_user';
        let chat = userChatSessions.get(sessionKey);
        if (!chat) {
            chat = nutritionCoachAgent.chat();
            userChatSessions.set(sessionKey, chat);
        }

        clearRecentToolProducts();
        const fullPrompt = userId ? `[Usuario ID: ${userId}] ${message}` : message;
        const response = await chat.send(fullPrompt);

        // Extract A2UI envelopes emitted by the a2ui() middleware
        const contentParts: any[] = (response as any).message?.content ?? [];
        const a2uiEnvelopes: any[] = [];
        for (const part of contentParts) {
            if (part?.metadata?.mimeType === 'application/a2ui+json' && Array.isArray(part?.data?.envelopes)) {
                a2uiEnvelopes.push(...part.data.envelopes);
            }
        }

        // Extract products returned by getAvailableProducts during this turn
        let turnProducts = consumeRecentToolProducts();

        // Fallback: if A2UI cards were emitted, also extract from A2UI envelopes if needed
        if (turnProducts.length === 0 && a2uiEnvelopes.length > 0) {
            turnProducts = extractProductsFromA2ui(a2uiEnvelopes);
        }

        if (turnProducts.length > 0 || a2uiEnvelopes.length > 0) {
            return {
                text: response.text || 'Aquí tienes los productos disponibles en Genkit Store:',
                products: turnProducts,
                a2ui: a2uiEnvelopes,
            };
        }

        return response.text;
    }
);
