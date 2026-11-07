import * as path from 'path';
import * as dotenv from 'dotenv';
import { genkit } from 'genkit/beta';
import { googleAI } from '@genkit-ai/google-genai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

dotenv.config({ path: ['.env.local', '.env'] });

if (process.env.K_SERVICE || process.env.FUNCTION_TARGET) {
    enableFirebaseTelemetry({
        projectId: process.env.GCLOUD_PROJECT || 'food-fit-with-genkit',
    });
}

export const ai = genkit({
    plugins: [googleAI()],
    promptDir: path.resolve(__dirname, '../../prompts'),
    model: 'googleai/gemini-3.6-flash',
});
