import { z } from 'genkit';

export const inputSchema = z.object({
    ingredient: z.string(),
    quantity_people: z.number()
});