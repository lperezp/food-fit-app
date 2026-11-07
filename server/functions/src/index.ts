import { defineSecret } from 'firebase-functions/params';
import { onCallGenkit, onRequest } from 'firebase-functions/https';

import {
    foodSuggestionFlow,
    foodSuggestionWithProhibitedFoodFlow,
} from './flows/food-suggestion.flow';
import { listFoodsSuggestionFlow } from './flows/list-foods.flow';
import { generateImageFoodFlow } from './flows/generate-image.flow';
import { nutritionCoachFlow } from './flows/nutrition-coach.flow';
import { getProhibitedFoodsTool } from './tools/prohibited-foods.tool';
import { getAvailableProductsTool } from './tools/genkit-store.tool';
import { nutritionCoachAgent } from './agents/nutrition-coach.agent';

const googleAIapiKey = defineSecret('GOOGLE_GENAI_API_KEY');

// Export Genkit primitives for Genkit Developer UI & local testing
export {
    foodSuggestionFlow,
    foodSuggestionWithProhibitedFoodFlow,
    listFoodsSuggestionFlow,
    generateImageFoodFlow,
    nutritionCoachFlow,
    getProhibitedFoodsTool,
    getAvailableProductsTool,
    nutritionCoachAgent,
};

// Export Cloud Functions for Firebase production deployment
export const foodSuggestionFlowFunction = onCallGenkit(
    {
        authPolicy: () => true,
        secrets: [googleAIapiKey],
        cors: '*',
    },
    foodSuggestionFlow
);

export const listFoodsSuggestionFlowFunction = onRequest(
    {
        cors: '*',
        secrets: [googleAIapiKey],
    },
    async (req, res) => {
        res.status(200).send(await listFoodsSuggestionFlow(req.body));
    }
);

export const generateImageFoodFlowFunction = onCallGenkit(
    {
        authPolicy: () => true,
        secrets: [googleAIapiKey],
        cors: '*',
    },
    generateImageFoodFlow
);

export const foodSuggestionWithProhibitedFoodFlowFunction = onCallGenkit(
    {
        authPolicy: () => true,
        secrets: [googleAIapiKey],
        cors: '*',
    },
    foodSuggestionWithProhibitedFoodFlow
);

export const nutritionCoachFlowFunction = onCallGenkit(
    {
        authPolicy: () => true,
        secrets: [googleAIapiKey],
        cors: '*',
        timeoutSeconds: 120,
    },
    nutritionCoachFlow
);
