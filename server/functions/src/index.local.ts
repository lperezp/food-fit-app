require('dotenv').config();

import { z, genkit, UserFacingError } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';
import { inputSchema, inputSchemaWithProhibitedFood } from './schemas/input.schema';
import * as admin from 'firebase-admin';
import { outputListFoodItemSchema } from './schemas/output-list-food-item.schema';

const ai = genkit({
    plugins: [
        vertexAI({ location: 'us-central1' }),
    ],
    promptDir: 'prompts',
});

if (!admin.apps.length) {
    admin.initializeApp();
}

export const db = admin.firestore();

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

export const foodSuggestionWithProhibitedFoodFlow = ai.defineFlow(
    {
        name: 'foodSuggestionWithProhibitedFoodFlow',
        inputSchema: inputSchemaWithProhibitedFood,
        outputSchema: outputListFoodItemSchema,
    },
    async (payload) => {
        try {
            const userDoc = await db.collection('prohibited-food').doc(payload.userId).get();

            if (!userDoc.exists) {
                throw new UserFacingError('UNAUTHENTICATED', 'No se encontraron datos del usuario.');
            }

            const prohibitedFoods = userDoc.data()?.foods;

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
            throw new UserFacingError('UNAVAILABLE', error)
        }
    }
);