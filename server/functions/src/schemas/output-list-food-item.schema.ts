import { outputFoodItemSchema } from './output-food-item.schema';
import { z } from 'genkit';

export const outputListFoodItemSchema = z.object({
    recipes: z.array(outputFoodItemSchema)
});