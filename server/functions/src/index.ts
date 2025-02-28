import { defineSecret } from "firebase-functions/params";
import { gemini20Flash001, imagen3, vertexAI } from '@genkit-ai/vertexai';
import { genkit, z } from 'genkit';
import { onCallGenkit, onRequest } from "firebase-functions/https";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { inputSchema } from './schemas/input.schema';
import { outputFoodItemSchema } from './schemas/output-food-item.schema';
import { outputListFoodItemSchema } from './schemas/output-list-food-item.schema';

enableFirebaseTelemetry();

const ai = genkit({
    plugins: [vertexAI({ location: 'us-central1' })]
});

const googleAIapiKey = defineSecret("GOOGLE_GENAI_API_KEY");

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
            model: gemini20Flash001,
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
