import { defineSecret } from "firebase-functions/params";
import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit/beta';
import { onCallGenkit, onRequest } from "firebase-functions/https";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { inputSchema, inputSchemaWithProhibitedFood } from './schemas/input.schema';
import { outputFoodItemSchema } from './schemas/output-food-item.schema';
import { outputListFoodItemSchema } from './schemas/output-list-food-item.schema';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

enableFirebaseTelemetry();

const ai = genkit({
    plugins: [
        googleAI(),
    ],
    model: 'googleai/gemini-3.6-flash',
});

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

const googleAIapiKey = defineSecret("GOOGLE_GENAI_API_KEY");

const foodSuggestionFlow = ai.defineFlow(
    {
        name: 'foodSuggestionFlow',
        inputSchema: inputSchema,
        outputSchema: z.array(outputFoodItemSchema),
    },
    async (payload) => {
        const { output } = await ai.generate({
            model: 'googleai/gemini-3.6-flash',
            prompt: `
            Eres el asistente de inteligencia artificial más conocedor del rubro gastronómico.
            Genere un lista de 4 recetas para una persona que quiere alimentarse de forma saludable.
            En la matriz del las recetas, coloque las recetas como lo haría un recetario de comida.

            Las recetas deben contener ${payload.ingredient} como ingrediente principal.

            Dé a cada receta una descripción únicos.

            Las recetas deben ser saludables y equilibradas. Además que sean para ${payload.quantity_people} personas.

            Las recetas tiene que estar en español.

            Limite las descripciones de las recetas a 7 palabras.
            `,
            output: { schema: z.array(outputFoodItemSchema) }
        });

        if (output == null) {
            throw new Error("Response doesn't satisfy schema.");
        }
        return output;
    }
);

export const foodSuggestionFlowFunction = onCallGenkit({
    authPolicy: () => true,
    secrets: [googleAIapiKey],
    cors: '*'
}, foodSuggestionFlow);

const listFoodsSuggestionFlow = ai.defineFlow(
    {
        name: 'listFoodsSuggestionFlow',
        outputSchema: outputListFoodItemSchema,
    },
    async () => {
        const { output } = await ai.generate({
            model: 'googleai/gemini-3.6-flash',
            prompt: `
           Eres el asistente de inteligencia artificial más conocedor del rubro gastronómico.
            Genere un lista de 4 recetas para una persona que quiere alimentarse de forma saludable.
            En la matriz del las recetas, coloque las recetas como lo haría un recetario de comida.
            Dé a cada receta una descripción únicos.
            Las recetas deben ser saludables y equilibradas. Además que sean para 4 personas.
            Las recetas tiene que estar en español.
            Limite las descripciones de las recetas a 7 palabras.
            `,
            output: { schema: outputListFoodItemSchema }
        });

        if (output == null) {
            throw new Error("Response doesn't satisfy schema.");
        }
        return output;
    }
);

export const listFoodsSuggestionFlowFunction = onRequest(
    {
        cors: '*',
        secrets: [googleAIapiKey],
    },
    async (req, res) => {
        res.status(200).send(await listFoodsSuggestionFlow(req.body));
    });

const generateImageFoodFlow = ai.defineFlow(
    {
        name: 'generateImageFoodFlow',
    },
    async (payload) => {
        const response = await ai.generate({
            model: 'googleai/gemini-3.1-flash-image',
            prompt: `Photo of the Peruvian dish ${payload.food}`,
            output: { format: 'media' },
        });

        if (response == null) {
            throw new Error("Response doesn't satisfy schema.");
        }

        return response.message.content[0].media;
    }
);

export const generateImageFoodFlowFunction = onCallGenkit({
    authPolicy: () => true,
    secrets: [googleAIapiKey],
    cors: '*'
}, generateImageFoodFlow);

const getProhibitedFoodsTool = ai.defineTool(
    {
        name: 'getProhibitedFoods',
        description: 'Obtiene la lista de alimentos prohibidos o alergias del usuario desde Firestore dado su userId.',
        inputSchema: z.object({
            userId: z.string().describe('ID del usuario a consultar en Firestore'),
        }),
        outputSchema: z.object({
            foods: z.array(z.string()).describe('Lista de alimentos prohibidos o alergias'),
            needsUserId: z.boolean().describe('Indica si falta el ID o es inválido y debes pedirlo al usuario'),
            message: z.string().describe('Mensaje o instrucción para el asistente'),
        }),
    },
    async ({ userId }) => {
        if (!userId || userId.trim() === '' || userId === 'default_user' || userId === 'test_user') {
            return {
                foods: [],
                needsUserId: true,
                message: 'No se ha proporcionado un ID de usuario válido. Pídele al usuario amablemente su ID para poder consultar sus alimentos prohibidos.',
            };
        }

        try {
            const userDoc = await db.collection('prohibited-food').doc(userId).get();

            if (!userDoc.exists) {
                return {
                    foods: [],
                    needsUserId: false,
                    message: `El usuario con ID ${userId} no tiene restricciones registradas en la base de datos.`,
                };
            }

            const prohibitedFoods = (userDoc.data()?.foods as string[]) ?? [];
            return {
                foods: prohibitedFoods,
                needsUserId: false,
                message: `El usuario tiene las siguientes restricciones: ${prohibitedFoods.join(', ')}`,
            };
        } catch (error: any) {
            console.warn(`[getProhibitedFoods] Aviso: No se pudo conectar a Firestore para el usuario ${userId}:`, error.message);
            return {
                foods: [],
                needsUserId: false,
                message: `No se pudo conectar a la base de datos: ${error.message}`,
            };
        }
    }
);

const foodSuggestionWithProhibitedFoodFlow = ai.defineFlow(
    {
        name: 'foodSuggestionWithProhibitedFoodFlow',
        inputSchema: inputSchemaWithProhibitedFood,
        outputSchema: z.array(outputFoodItemSchema),
    },
    async (payload) => {
        const result = await getProhibitedFoodsTool({ userId: payload.userId });
        const prohibitedFoods = result.foods;

        const prohibitedFoodsContext = prohibitedFoods.length > 0
            ? `El usuario es alérgico a: ${prohibitedFoods.join(', ')}. **ASEGÚRATE DE EXCLUIR ESTOS INGREDIENTES. EN EL CASO TE INDIQUE UN ALIMENTO DE LA LISTA COMO ALIMENTO PRINCIPAL, NO GENERES NINGUNA RECETA.**`
            : 'No hay alergias conocidas.';

        const { output } = await ai.generate({
            model: 'googleai/gemini-3.6-flash',
            system: `Tu única tarea es generar recetas. 
            REGLA DE SEGURIDAD ABSOLUTA: ${prohibitedFoodsContext}
            Nunca, bajo ninguna circunstancia, incluyas alguno de esos ingredientes.`,
            prompt: `
            Eres el asistente de inteligencia artificial más conocedor del rubro gastronómico.
            Genere un lista de 4 recetas para una persona que quiere alimentarse de forma saludable.
            En la matriz del las recetas, coloque las recetas como lo haría un recetario de comida.

            Las recetas deben contener ${payload.ingredient} como ingrediente principal.

            Dé a cada receta una descripción únicos.

            Las recetas deben ser saludables y equilibradas. Además que sean para ${payload.quantity_people} personas.

            Instrucciones de seguridad: ${prohibitedFoodsContext}

            Las recetas tiene que estar en español.

            Limite las descripciones de las recetas a 7 palabras.
            `,
            config: {
                temperature: 0.2,
            },
            output: { schema: z.array(outputFoodItemSchema) }
        });
        if (output == null) {
            throw new Error("Response doesn't satisfy schema.");
        }
        return output;
    }
);

export const foodSuggestionWithProhibitedFoodFlowFunction = onCallGenkit({
    authPolicy: () => true,
    secrets: [googleAIapiKey],
    cors: '*'
}, foodSuggestionWithProhibitedFoodFlow);

const nutritionCoachAgent = ai.defineAgent({
    name: 'nutritionCoachAgent',
    description: 'Coach interactivo de Food Fit para planificación de comidas saludables.',
    tools: [getProhibitedFoodsTool],
    system: `Eres el asistente experto en nutrición y cocina saludable de Food Fit.

REGLAS CRÍTICAS DE IDENTIFICACIÓN:
1. REQUISITO DE ID: Para sugerir recetas personalizadas o revisar alimentos prohibidos, debes usar la herramienta 'getProhibitedFoods'.
2. SOLICITUD DE ID: Si la herramienta 'getProhibitedFoods' responde con needsUserId: true (o si aún no conoces el ID del usuario), NO des recetas todavía. Responde saludando y pidiéndole amablemente al usuario su ID de usuario para poder verificar sus restricciones antes de sugerir comidas.
3. EXCLUSIÓN DE ALIMENTOS: Si la herramienta devuelve restricciones en 'foods', nunca incluyas ninguno de esos alimentos en tus recomendaciones.
4. ESTILO: Sé conciso, empático y motivador, priorizando opciones saludables.`,
});

const nutritionCoachFlow = ai.defineFlow(
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

export const nutritionCoachFlowFunction = onCallGenkit({
    authPolicy: () => true,
    secrets: [googleAIapiKey],
    cors: '*'
}, nutritionCoachFlow);