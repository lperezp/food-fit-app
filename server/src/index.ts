require('dotenv').config();

// import the Genkit and Google AI plugin libraries
import { gemini15Flash, googleAI, gemini10Pro } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// configure a Genkit instance
const ai = genkit({
    plugins: [googleAI()],
    model: gemini10Pro, // set default model
});

export const menuSuggestionFlow = ai.defineFlow(
    {
        name: 'menuSuggestionFlow',
    },
    async (restaurantTheme) => {
        const { text } = await ai.generate({
            model: gemini15Flash,
            prompt: `Invent a menu item for a ${restaurantTheme} themed restaurant.`,
        });
        return text;
    }
);