require('dotenv')

import { z, genkit, UserFacingError } from 'genkit/beta';
import { inputSchema, inputSchemaWithProhibitedFood } from './schemas/input.schema';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { outputListFoodItemSchema } from './schemas/output-list-food-item.schema';
import { createMcpHost } from '@genkit-ai/mcp';
import { ollama } from 'genkitx-ollama';
import path from 'path';

import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

enableFirebaseTelemetry();

const OLLAMA_MODEL = 'ollama/gemma4:12b';
const OLLAMA_SERVER = 'http://127.0.0.1:11434';

const ai = genkit({
    plugins: [
        ollama({
            models: [{ name: OLLAMA_MODEL }],
            serverAddress: OLLAMA_SERVER,
        }),
    ],
});

if (!getApps().length) {
    initializeApp({
        projectId: 'food-fit-with-genkit',
    });
}

export const db = getFirestore();

export const foodSuggestionFlow = ai.defineFlow(
    {
        name: 'foodSuggestionFlow',
        inputSchema: inputSchema,
        outputSchema: outputListFoodItemSchema,
    },
    async (payload) => {
        try {
            const suggestionPrompt = ai.prompt('foodSuggestion');
            const { output } = await suggestionPrompt(payload);
            if (output == null) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la receta.');
            }
            return output;
        } catch (error) {
            throw new UserFacingError('UNAVAILABLE', error);
        }
    }
);

export const listFoodsSuggestionFlow = ai.defineFlow(
    {
        name: 'listFoodsSuggestionFlow',
        outputSchema: outputListFoodItemSchema,
    },
    async () => {
        try {
            const listSuggestionPrompt = ai.prompt('listFoodsSuggestion');
            const { output } = await listSuggestionPrompt();
            if (output == null) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la lista de alimentos.');
            }
            return output;
        } catch (error) {
            throw new UserFacingError('UNAVAILABLE', error);
        }
    }
);

export const generateImageFoodFlow = ai.defineFlow(
    {
        name: 'generateImageFoodFlow',
        inputSchema: z.object({
            food: z.string(),
        })
    },
    async (payload) => {
        try {
            const imagePrompt = ai.prompt('generateImageFood');
            const response = await imagePrompt(payload);

            if (response == null) {
                throw new UserFacingError('UNAVAILABLE', 'No se pudo generar la imagen.');
            }

            return response.media;
        } catch (error) {
            throw new UserFacingError('UNAVAILABLE', error);
        }
    }
);

export const getProhibitedFoodsTool = ai.defineTool(
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

export const foodSuggestionWithProhibitedFoodFlow = ai.defineFlow(
    {
        name: 'foodSuggestionWithProhibitedFoodFlow',
        inputSchema: inputSchemaWithProhibitedFood,
        outputSchema: outputListFoodItemSchema,
    },
    async (payload) => {
        try {
            const result = await getProhibitedFoodsTool({ userId: payload.userId });
            const prohibitedFoods = result.foods;

            const prohibitedFoodsContext = prohibitedFoods.length > 0
                ? `El usuario es alérgico a: ${prohibitedFoods.join(', ')}. **ASEGÚRATE DE EXCLUIR ESTOS INGREDIENTES. EN EL CASO TE INDIQUE UN ALIMENTO DE LA LISTA COMO ALIMENTO PRINCIPAL, NO GENERES NINGUNA RECETA.**`
                : 'No hay alergias conocidas.';

            const suggestionPrompt = ai.prompt('foodSuggestionWithProhibitedFood');
            const { output } = await suggestionPrompt({
                ...payload,
                prohibited_foods_context: prohibitedFoodsContext
            });

            if (output == null) {
                throw new UserFacingError('UNAVAILABLE', 'Hubo un error en la generación de la receta.');
            }
            return output;
        } catch (error) {
            throw new UserFacingError('UNAVAILABLE', error);
        }
    }
);

export const nutritionCoachAgent = ai.defineAgent({
    name: 'nutritionCoachAgent',
    description: 'Coach interactivo de Food Fit para planificación de comidas saludables.',
    tools: [getProhibitedFoodsTool],
    system: `Eres el asistente experto en nutrición y cocina saludable de Food Fit.

    En el caso te pida alguna receta, usa la herramienta getProhibitedFoods para obtener las restricciones del usuario.

REGLAS CRÍTICAS DE IDENTIFICACIÓN:
1. REQUISITO DE ID: Para sugerir recetas personalizadas o revisar alimentos prohibidos, debes usar la herramienta 'getProhibitedFoods'.
2. SOLICITUD DE ID: Si la herramienta 'getProhibitedFoods' responde con needsUserId: true (o si aún no conoces el ID del usuario), NO des recetas todavía. Responde saludando y pidiéndole amablemente al usuario su ID de usuario para poder verificar sus restricciones antes de sugerir comidas.
3. EXCLUSIÓN DE ALIMENTOS: Si la herramienta devuelve restricciones en 'foods', nunca incluyas ninguno de esos alimentos en tus recomendaciones.
4. ESTILO: Sé conciso, empático y motivador, priorizando opciones saludables.`,
});

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

const mcpHost = createMcpHost({
    name: 'myHost',
    mcpServers: {
        fs: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
            cwd: path.resolve('/Users/luiseduardo/Downloads/MCP'),
        },
    },
});

export const analyzeDirectoryFlow = ai.defineFlow(
    {
        name: 'analyzeDirectoryFlow',
        inputSchema: z.string(),
        outputSchema: z.string(),
    },
    async (prompt) => {
        // Obtener las herramientas que expone el servidor MCP
        const mcpTools = await mcpHost.getActiveTools(ai);

        const response = await ai.generate({
            model: OLLAMA_MODEL,
            prompt,
            tools: mcpTools,
        });

        return response.text;
    }
);