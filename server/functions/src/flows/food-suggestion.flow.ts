import { z, UserFacingError } from 'genkit/beta';
import { ai } from '../config/genkit';
import { inputSchema, inputSchemaWithProhibitedFood } from '../schemas/input.schema';
import { outputFoodItemSchema } from '../schemas/output-food-item.schema';
import { outputListFoodItemSchema } from '../schemas/output-list-food-item.schema';
import { getProhibitedFoodsTool } from '../tools/prohibited-foods.tool';

export const foodSuggestionFlow = ai.defineFlow(
    {
        name: 'foodSuggestionFlow',
        inputSchema: inputSchema,
        outputSchema: z.array(outputFoodItemSchema),
    },
    async (payload) => {
        try {
            const suggestionPrompt = ai.prompt<typeof inputSchema, typeof outputListFoodItemSchema>('foodSuggestion');
            const { output } = await suggestionPrompt(payload);
            if (!output?.recipes) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la receta.');
            }
            return output.recipes;
        } catch (error: any) {
            throw new UserFacingError('UNAVAILABLE', error?.message || String(error));
        }
    }
);

export const foodSuggestionWithProhibitedFoodFlow = ai.defineFlow(
    {
        name: 'foodSuggestionWithProhibitedFoodFlow',
        inputSchema: inputSchemaWithProhibitedFood,
        outputSchema: z.array(outputFoodItemSchema),
    },
    async (payload) => {
        try {
            const result = await getProhibitedFoodsTool({ userId: payload.userId });
            const prohibitedFoods = result.foods;

            const prohibitedFoodsContext = prohibitedFoods.length > 0
                ? `El usuario es alérgico a: ${prohibitedFoods.join(', ')}. **ASEGÚRATE DE EXCLUIR ESTOS INGREDIENTES. EN EL CASO TE INDIQUE UN ALIMENTO DE LA LISTA COMO ALIMENTO PRINCIPAL, NO GENERES NINGUNA RECETA.**`
                : 'No hay alergias conocidas.';

            const suggestionPrompt = ai.prompt<any, typeof outputListFoodItemSchema>('foodSuggestionWithProhibitedFood');
            const { output } = await suggestionPrompt({
                ...payload,
                prohibited_foods_context: prohibitedFoodsContext,
            });

            if (!output?.recipes) {
                throw new UserFacingError('UNAVAILABLE', 'Hubo un error en la generación de la receta.');
            }
            return output.recipes;
        } catch (error: any) {
            throw new UserFacingError('UNAVAILABLE', error?.message || String(error));
        }
    }
);
