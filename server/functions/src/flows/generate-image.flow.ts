import { z, UserFacingError } from 'genkit/beta';
import { ai } from '../config/genkit';

export const generateImageFoodFlow = ai.defineFlow(
    {
        name: 'generateImageFoodFlow',
        inputSchema: z.object({
            food: z.string(),
        }),
    },
    async (payload) => {
        try {
            const imagePrompt = ai.prompt('generateImageFood');
            const response = await imagePrompt(payload);

            if (response == null || !response.media) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la imagen.');
            }

            return response.media;
        } catch (error: any) {
            throw new UserFacingError('UNAVAILABLE', error?.message || String(error));
        }
    }
);
