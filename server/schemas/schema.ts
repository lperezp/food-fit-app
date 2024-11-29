import { z } from 'genkit';


export const outputFoodItemSchema = z.object({
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

export const inputSchema = z.object({
    ingredient: z.string(),
    quantity_people: z.number()
});

export const outputListFoodItemSchema = z.object({
    recipes: z.array(outputFoodItemSchema)
});