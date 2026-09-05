import { defineSecret } from "firebase-functions/params";
import { imagen3, vertexAI } from '@genkit-ai/vertexai';
import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';
import { onCallGenkit, onRequest } from "firebase-functions/https";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { inputSchema, inputSchemaWithProhibitedFood } from './schemas/input.schema';
import { outputFoodItemSchema } from './schemas/output-food-item.schema';
import { outputListFoodItemSchema } from './schemas/output-list-food-item.schema';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

enableFirebaseTelemetry();

const ai = genkit({
    plugins: [
        vertexAI({ location: 'us-central1' }),
        googleAI(),
    ],
    model: 'googleai/gemini-3.6-flash',
});

if (!getApps().length) {
    initializeApp();
}

export const db = getFirestore();

const googleAIapiKey = defineSecret("GOOGLE_GENAI_API_KEY");

export const foodSuggestionFlow = ai.defineFlow(
    {
        name: 'foodSuggestionFlow',
        inputSchema: inputSchema,
        outputSchema: z.array(outputFoodItemSchema),
    },
    async (payload) => {
        const { output } = await ai.generate({
            model: 'googleai/gemini-3.6-flash',
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

export const foodSuggestionFlowFunction = onCallGenkit({
    authPolicy: () => true,
    secrets: [googleAIapiKey],
    cors: '*'
}, foodSuggestionFlow);

export const listFoodsSuggestionFlow = ai.defineFlow(
    {
        name: 'listFoodsSuggestionFlow',
        outputSchema: outputListFoodItemSchema,
    },
    async () => {
        const { output } = await ai.generate({
            model: 'googleai/gemini-3.6-flash',
            prompt: `
           Eres el asistente de inteligencia artificial más conocedor del rubro gastronómico.
            Genere un lista de 4 recetas para una persona que quiere alimentarse de forma saludable.
            En la matriz del las recetas, coloque las recetas como lo haría un recetario de comida.
            Dé a cada receta una descripción únicos.
            Las recetas deben ser saludables y equilibradas. Además que sean para 4 personas.
            Las recetas tiene que estar en español.
            Limite las descripciones de las recetas a 7 palabras.
            `,
            output: { schema: outputListFoodItemSchema }
        });

        if (output == null) {
            throw new Error("Response doesn't satisfy schema.");
        }
        return output;
    }
);

export const listFoodsSuggestionFlowFunction = onRequest(
    {
        cors: '*',
        secrets: [googleAIapiKey],
    },
    async (req, res) => {
        res.status(200).send(await listFoodsSuggestionFlow(req.body));
    });

export const generateImageFoodFlow = ai.defineFlow(
    {
        name: 'generateImageFoodFlow',
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

export const generateImageFoodFlowFunction = onCallGenkit({
    authPolicy: () => true,
    secrets: [googleAIapiKey],
    cors: '*'
}, generateImageFoodFlow);

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
            model: 'googleai/gemini-3.6-flash',
            system: `Tu única tarea es generar recetas. 
            REGLA DE SEGURIDAD ABSOLUTA: ${prohibitedFoodsContext}
            Nunca, bajo ninguna circunstancia, incluyas alguno de esos ingredientes.`,
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

export const foodSuggestionWithProhibitedFoodFlowFunction = onCallGenkit({
    authPolicy: () => true,
    secrets: [googleAIapiKey],
    cors: '*'
}, foodSuggestionWithProhibitedFoodFlow);