require('dotenv').config();

import { z, genkit, UserFacingError } from 'genkit/beta';
import { inputSchema, inputSchemaWithProhibitedFood } from './schemas/input.schema';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { outputListFoodItemSchema } from './schemas/output-list-food-item.schema';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
    plugins: [googleAI()],
    promptDir: 'prompts',
    model: 'googleai/gemini-3.6-flash',
});

if (!getApps().length) {
    initializeApp();
}

export const db = getFirestore();

export const foodSuggestionFlow = ai.defineFlow(
    {
        name: 'foodSuggestionFlow',
        inputSchema: inputSchema,
        outputSchema: outputListFoodItemSchema,
    },
    async (payload) => {
        try {
            const suggestionPrompt = ai.prompt('foodSuggestion');
            const { output } = await suggestionPrompt(payload);
            if (output == null) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la receta.');
            }
            return output;
        } catch (error) {
            throw new UserFacingError('UNAVAILABLE', error);
        }
    }
);

export const listFoodsSuggestionFlow = ai.defineFlow(
    {
        name: 'listFoodsSuggestionFlow',
        outputSchema: outputListFoodItemSchema,
    },
    async () => {
        try {
            const listSuggestionPrompt = ai.prompt('listFoodsSuggestion');
            const { output } = await listSuggestionPrompt();
            if (output == null) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la lista de alimentos.');
            }
            return output;
        } catch (error) {
            throw new UserFacingError('UNAVAILABLE', error);
        }
    }
);

export const generateImageFoodFlow = ai.defineFlow(
    {
        name: 'generateImageFoodFlow',
        inputSchema: z.object({
            food: z.string(),
        })
    },
    async (payload) => {
        try {
            const imagePrompt = ai.prompt('generateImageFood');
            const response = await imagePrompt(payload);

            if (response == null) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la imagen.');
            }

            return response.media;
        } catch (error) {
            throw new UserFacingError('UNAVAILABLE', error);
        }
    }
);

export const getProhibitedFoodsTool = ai.defineTool(
    {
        name: 'getProhibitedFoods',
        description: 'Obtiene la lista de alimentos prohibidos o alergias del usuario desde Firestore.',
        inputSchema: z.object({
            userId: z.string().describe('ID del usuario a consultar en Firestore'),
        }),
        outputSchema: z.array(z.string()).describe('Lista de alimentos prohibidos o alergias'),
    },
    async ({ userId }) => {
        const userDoc = await db.collection('prohibited-food').doc(userId).get();

        if (!userDoc.exists) {
            throw new UserFacingError('UNAUTHENTICATED', 'No se encontraron datos del usuario.');
        }

        const prohibitedFoods = userDoc.data()?.foods;
        return (prohibitedFoods as string[]) ?? [];
    }
);

export const foodSuggestionWithProhibitedFoodFlow = ai.defineFlow(
    {
        name: 'foodSuggestionWithProhibitedFoodFlow',
        inputSchema: inputSchemaWithProhibitedFood,
        outputSchema: outputListFoodItemSchema,
    },
    async (payload) => {
        try {
            const prohibitedFoods = await getProhibitedFoodsTool({ userId: payload.userId });

            const prohibitedFoodsContext = prohibitedFoods.length > 0
                ? `El usuario es alérgico a: ${prohibitedFoods.join(', ')}. **ASEGÚRATE DE EXCLUIR ESTOS INGREDIENTES. EN EL CASO TE INDIQUE UN ALIMENTO DE LA LISTA COMO ALIMENTO PRINCIPAL, NO GENERES NINGUNA RECETA.**`
                : 'No hay alergias conocidas.';

            const suggestionPrompt = ai.prompt('foodSuggestionWithProhibitedFood');
            const { output } = await suggestionPrompt({
                ...payload,
                prohibited_foods_context: prohibitedFoodsContext
            });

            if (output == null) {
                throw new UserFacingError('UNAVAILABLE', 'Hubo un error en la generación de la receta.');
            }
            return output;
        } catch (error) {
            throw new UserFacingError('UNAVAILABLE', error);
        }
    }
);


export const nutritionCoachAgent = ai.defineAgent({
    name: 'nutritionCoachAgent',
    description: 'Coach interactivo de Food Fit para planificación de comidas saludables.',
    tools: [getProhibitedFoodsTool],
    system: `Eres el asistente experto en nutrición y cocina saludable de Food Fit.
Tus responsabilidades:
1. Ayudar al usuario a planificar sus comidas adaptadas a sus calorías o restricciones.
2. Si el usuario pide ideas de recetas, usa 'getProhibitedFoodsTool' para consultar prohibiciones ali.
3. Recuerda las preferencias expresadas en la conversación (ej. si es vegetariano, alérgico o busca ganar masa muscular).
4. Sé conciso, alentador y prioriza ingredientes accesibles y métodos de cocción saludables.`,
});