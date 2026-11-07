import { z } from 'genkit/beta';
import { ai } from '../config/genkit';
import { db } from '../config/firebase';

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
                message: `Restricciones internas del usuario: ${prohibitedFoods.join(', ')}. REGLA: NO menciones estas restricciones en saludos ni en sugerencias generales (solo evítalas en silencio). ÚNICAMENTE menciónalas si el usuario te pide explícitamente alguno de estos alimentos.`,
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
