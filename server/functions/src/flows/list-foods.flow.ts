import { UserFacingError } from 'genkit/beta';
import { ai } from '../config/genkit';
import { outputListFoodItemSchema } from '../schemas/output-list-food-item.schema';

export const listFoodsSuggestionFlow = ai.defineFlow(
    {
        name: 'listFoodsSuggestionFlow',
        outputSchema: outputListFoodItemSchema,
    },
    async () => {
        try {
            const listSuggestionPrompt = ai.prompt<any, typeof outputListFoodItemSchema>('listFoodsSuggestion');
            const { output } = await listSuggestionPrompt();
            if (output == null) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la lista de alimentos.');
            }
            return output;
        } catch (error: any) {
            throw new UserFacingError('UNAVAILABLE', error?.message || String(error));
        }
    }
);
