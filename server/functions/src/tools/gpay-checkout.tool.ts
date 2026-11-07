import { z } from 'genkit/beta';
import { ai } from '../config/genkit';
import { db } from '../config/firebase';

const orderItemInputSchema = z.object({
    productId: z.string().optional().default(''),
    name: z.string().describe('Nombre comercial del producto'),
    brand: z.string().optional().default('GENKIT STORE'),
    presentation: z.string().optional(),
    quantity: z.number().default(1).describe('Cantidad de unidades'),
    unitFinalPrice: z.number().describe('Precio final unitario en soles (ej. 21.90)'),
});

export const checkoutWithGPayTool = ai.defineTool(
    {
        name: 'checkoutWithGPay',
        description: 'Procesa un pago ficticio con Google Pay (G Pay) para los productos seleccionados de Genkit Store y guarda la orden de compra en la colección "orders" de Firestore. Úsala únicamente cuando el usuario confirme explícitamente que desea pagar/comprar con G Pay o Google Pay.',
        inputSchema: z.object({
            userId: z.string().optional().default('anonymous').describe('ID del usuario que realiza la compra'),
            cardLast4: z.string().optional().default('4242').describe('Últimos 4 dígitos de la tarjeta en G Pay'),
            items: z.array(orderItemInputSchema).describe('Lista de productos a comprar con G Pay'),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            orderCode: z.string(),
            totalFinal: z.number(),
            paymentMethod: z.string(),
            firestoreCollection: z.string(),
            message: z.string(),
        }),
    },
    async ({ userId = 'anonymous', cardLast4 = '4242', items }) => {
        const orderCode = 'GK-' + Math.floor(100000 + Math.random() * 900000);
        const normalizedItems = items.map((item) => ({
            productId: item.productId || orderCode,
            name: item.name,
            brand: item.brand || 'GENKIT STORE',
            presentation: item.presentation || '1 un',
            quantity: item.quantity || 1,
            unitFinalPrice: item.unitFinalPrice,
            subtotal: Number(((item.unitFinalPrice || 0) * (item.quantity || 1)).toFixed(2)),
        }));

        const totalFinal = Number(
            normalizedItems.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2)
        );

        const orderDoc = {
            orderCode,
            userId,
            store: 'Genkit Store',
            paymentMethod: 'GOOGLE_PAY',
            cardBrand: 'VISA',
            cardLast4,
            status: 'PAID',
            currency: 'PEN',
            itemsCount: normalizedItems.reduce((acc, i) => acc + i.quantity, 0),
            items: normalizedItems,
            subtotalRegular: totalFinal,
            totalDiscount: 0,
            totalFinal,
            createdAt: new Date().toISOString(),
        };

        try {
            await db.collection('orders').doc(orderCode).set(orderDoc);
            return {
                success: true,
                orderCode,
                totalFinal,
                paymentMethod: `Google Pay (Visa •••• ${cardLast4})`,
                firestoreCollection: `orders/${orderCode}`,
                message: `Pago con Google Pay procesado exitosamente. Orden ${orderCode} guardada en Firestore (orders/${orderCode}) por S/ ${totalFinal.toFixed(2)}.`,
            };
        } catch (error: any) {
            console.warn('[checkoutWithGPay] Error guardando orden en Firestore:', error.message);
            return {
                success: true,
                orderCode,
                totalFinal,
                paymentMethod: `Google Pay (Visa •••• ${cardLast4})`,
                firestoreCollection: `orders/${orderCode}`,
                message: `Pago simulado con Google Pay completado (Orden ${orderCode} por S/ ${totalFinal.toFixed(2)}). Aviso Firestore: ${error.message}`,
            };
        }
    }
);
