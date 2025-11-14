import { Injectable } from '@angular/core';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import app from '../../config/firebase.config';

@Injectable({
    providedIn: 'root'
})
export class FirestoreService {
    private db = getFirestore(app);

    constructor() { }

    // Obtener todos los alimentos prohibidos
    async getProhibitedFoods(): Promise<any[]> {
        try {
            const prohibitedFoodsCollection = collection(this.db, 'prohibited-food');
            const snapshot = await getDocs(prohibitedFoodsCollection);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error al obtener alimentos prohibidos:', error);
            throw error;
        }
    }

    // Obtener alimentos prohibidos por usuario
    async getProhibitedFoodsByUser(userId: string): Promise<any[]> {
        try {
            const prohibitedFoodsCollection = collection(this.db, 'prohibited-food');
            const q = query(prohibitedFoodsCollection, where('userId', '==', userId));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error al obtener alimentos prohibidos del usuario:', error);
            throw error;
        }
    }

    // Obtener un documento específico de alimentos prohibidos
    async getProhibitedFoodById(docId: string): Promise<any> {
        try {
            const docRef = doc(this.db, 'prohibited-food', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                };
            } else {
                console.log('No se encontró el documento');
                return null;
            }
        } catch (error) {
            console.error('Error al obtener el documento:', error);
            throw error;
        }
    }
}