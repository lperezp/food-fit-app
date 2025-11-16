import { z } from 'genkit';

export const inputSchema = z.object({
    ingredient: z.string(),
    quantity_people: z.number()
});

export const inputSchemaWithProhibitedFood = z.object({
    ingredient: z.string(),
    quantity_people: z.number(),
    userId: z.string()
});