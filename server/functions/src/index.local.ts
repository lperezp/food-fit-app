require('dotenv').config();

import { z, genkit } from 'genkit';
import { gemini20Flash001, imagen3, vertexAI } from '@genkit-ai/vertexai';
import { outputFoodItemSchema } from './schemas/output-food-item.schema';
import { inputSchema, inputSchemaWithProhibitedFood } from './schemas/input.schema';
import * as admin from 'firebase-admin';

const ai = genkit({
    plugins: [
        vertexAI({ location: 'us-central1' }),
    ],
});

if (!admin.apps.length) {
    admin.initializeApp();
}

export const db = admin.firestore();

export const foodSuggestionFlow = ai.defineFlow(
    {
        name: 'foodSuggestionFlow',
        inputSchema: inputSchema,
        outputSchema: z.array(outputFoodItemSchema),
    },
    async (payload) => {
        const { output } = await ai.generate({
            model: gemini20Flash001,
            prompt: `
            Eres el asistente de inteligencia artificial más conocedor del rubro gastronómico.
            Genere un lista de 4 recetas para una persona que quiere alimentarse de forma saludable.
            En la matriz del las recetas, coloque las recetas como lo haría un recetario de comida.

            Las recetas deben contener ${payload.ingredient} como ingrediente principal.

            Dé a cada receta una descripción únicos.

            Las recetas deben ser saludables y equilibradas. Además que sean para ${payload.quantity_people} personas.

            Las recetas tiene que estar en español.

            Limite las descripciones de las recetas a 7 palabras.
            `,
            output: { schema: z.array(outputFoodItemSchema) }
        });
        if (output == null) {
            throw new Error("Response doesn't satisfy schema.");
        }
        return output;
    }
);

export const listFoodsSuggestionFlow = ai.defineFlow(
    {
        name: 'listFoodsSuggestionFlow',
        outputSchema: z.array(outputFoodItemSchema),
    },
    async () => {
        const { output } = await ai.generate({
            model: gemini20Flash001,
            prompt: `Eres el asistente de inteligencia artificial más conocedor del rubro gastronómico.
            Genere un lista de 4 recetas para una persona que quiere alimentarse de forma saludable.
            En la matriz del las recetas, coloque las recetas como lo haría un recetario de comida.

            Dé a cada receta una descripción únicos.

            Las recetas deben ser saludables y equilibradas. Además que sean para 4 personas.

            Las recetas tiene que estar en español.

            Limite las descripciones de las recetas a 7 palabras.`,
            output: { schema: z.array(outputFoodItemSchema) }
        });
        if (output == null) {
            throw new Error("Response doesn't satisfy schema.");
        }
        return output;
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
        const response = await ai.generate({
            model: imagen3,
            prompt: `Photo of the Peruvian dish ${payload.food}`,
            output: { format: 'media' },
        });

        if (response == null) {
            throw new Error("Response doesn't satisfy schema.");
        }

        return response.message.content[0].media;
    }
);

export const foodSuggestionWithProhibitedFoodFlow = ai.defineFlow(
    {
        name: 'foodSuggestionWithProhibitedFoodFlow',
        inputSchema: inputSchemaWithProhibitedFood,
        outputSchema: z.array(outputFoodItemSchema),
    },
    async (payload) => {
        const userDoc = await db.collection('prohibited-food').doc(payload.userId).get();
        const prohibitedFoods = userDoc.exists ? userDoc.data()?.foods : [];

        const prohibitedFoodsContext = prohibitedFoods.length > 0
            ? `El usuario es alérgico a: ${prohibitedFoods.join(', ')}. **ASEGÚRATE DE EXCLUIR ESTOS INGREDIENTES. EN EL CASO TE INDIQUE UN ALIMENTO DE LA LISTA COMO ALIMENTO PRINCIPAL, NO GENERES NINGUNA RECETA.**`
            : 'No hay alergias conocidas.';

        const { output } = await ai.generate({
            model: gemini20Flash001,
            prompt: `
            Eres el asistente de inteligencia artificial más conocedor del rubro gastronómico.
            Genere un lista de 4 recetas para una persona que quiere alimentarse de forma saludable.
            En la matriz del las recetas, coloque las recetas como lo haría un recetario de comida.

            Las recetas deben contener ${payload.ingredient} como ingrediente principal.

            Dé a cada receta una descripción únicos.

            Las recetas deben ser saludables y equilibradas. Además que sean para ${payload.quantity_people} personas.

            Instrucciones de seguridad: ${prohibitedFoodsContext}

            Las recetas tiene que estar en español.

            Limite las descripciones de las recetas a 7 palabras.
            `,
            config: {
                temperature: 0.2,
            },
            output: { schema: z.array(outputFoodItemSchema) }
        });
        if (output == null) {
            throw new Error("Response doesn't satisfy schema.");
        }
        return output;
    }
);