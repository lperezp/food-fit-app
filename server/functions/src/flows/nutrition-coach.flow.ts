import { z } from 'genkit/beta';
import { ai } from '../config/genkit';
import { nutritionCoachAgent } from '../agents/nutrition-coach.agent';

export const nutritionCoachFlow = ai.defineFlow(
    {
        name: 'nutritionCoachFlow',
        inputSchema: z.object({
            message: z.string().describe('Mensaje para el coach nutricional'),
            userId: z.string().optional().describe('ID opcional del usuario'),
        }),
    },
    async ({ message, userId }) => {
        const chat = nutritionCoachAgent.chat();
        const fullPrompt = userId ? `[Usuario ID: ${userId}] ${message}` : message;
        const response = await chat.send(fullPrompt);
        return response.text;
    }
);
