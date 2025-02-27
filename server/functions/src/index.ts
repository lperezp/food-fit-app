// import the Genkit and Google AI plugin libraries
import { defineSecret } from "firebase-functions/params";
import { gemini15Flash, imagen3, vertexAI } from '@genkit-ai/vertexai';
import { genkit, z } from 'genkit';
import { onCallGenkit, onRequest } from "firebase-functions/https";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

enableFirebaseTelemetry();

const ai = genkit({
    plugins: [vertexAI({ location: 'us-central1' })]
});

const googleAIapiKey = defineSecret("GOOGLE_GENAI_API_KEY");

const inputSchema = z.object({
    ingredient: z.string(),
    quantity_people: z.number()
});

const outputFoodItemSchema = z.object({
    name: z.string(),
    description: z.string(),
    ingredients: z.array(z.string()),
    nutritional_information: z.object({
        cal: z.number(),
        carbohydrates: z.number(),
        fats: z.number(),
        sodium: z.number(),
        cholesterol: z.number(),
        proteins: z.number(),
    }),
    preparation_time: z.string(),
    level: z.string(),
    preparation: z.array(z.string()),
});

const outputListFoodItemSchema = z.object({
    recipes: z.array(outputFoodItemSchema)
});

export const foodSuggestionFlow = ai.defineFlow(
    {
        name: 'foodSuggestionFlow',
        inputSchema: inputSchema,
        outputSchema: z.array(outputFoodItemSchema),
    },
    async (payload) => {
        const { output } = await ai.generate({
            model: gemini15Flash,
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
            model: gemini15Flash,
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
