import * as path from 'path';
import * as dotenv from 'dotenv';
import { genkit } from 'genkit/beta';
import { googleAI } from '@genkit-ai/google-genai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

dotenv.config({ path: ['.env.local', '.env'] });

enableFirebaseTelemetry();

export const ai = genkit({
    plugins: [googleAI()],
    promptDir: path.resolve(__dirname, '../../prompts'),
    model: 'googleai/gemini-3.6-flash',
});
