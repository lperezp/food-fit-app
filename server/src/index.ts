require('dotenv').config();

// import the Genkit and Google AI plugin libraries
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { z, genkit } from 'genkit';
import { inputSchema, outputFoodItemSchema, outputListFoodItemSchema } from '../schemas/schema';





// configure a Genkit instance
const ai = genkit({
    plugins: [googleAI()],
    model: gemini15Flash, // set default model
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

export const listFoodsSuggestionFlow = ai.defineFlow(
    {
        name: 'listFoodsSuggestionFlow',
        outputSchema: outputListFoodItemSchema,
    },
    async () => {
        const { output } = await ai.generate({
            model: gemini15Flash,
            prompt: `Eres el asistente de inteligencia artificial más conocedor del rubro gastronómico.
            Genere un lista de 4 recetas para una persona que quiere alimentarse de forma saludable.
            En la matriz del las recetas, coloque las recetas como lo haría un recetario de comida.
            Dé a cada receta una descripción únicos.
            Las recetas deben ser saludables y equilibradas. Además que sean para 4 personas.
            Las recetas tiene que estar en español.
            Limite las descripciones de las recetas a 7 palabras.`,
            output: { schema: outputListFoodItemSchema }
        });
        if (output == null) {
            throw new Error("Response doesn't satisfy schema.");
        }
        return output;
    }
);