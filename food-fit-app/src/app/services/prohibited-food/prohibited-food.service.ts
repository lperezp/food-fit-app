import { Injectable } from '@angular/core';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import app from '../../config/firebase.config';

export interface ProhibitedFood {
  name: string;
}

export interface UserProhibitedFoods {
  foods: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProhibitedFoodService {
  private db = getFirestore(app);
  private collectionName = 'prohibited-food';

  constructor() { }

  // Obtener la referencia del documento del usuario
  private getUserDocRef(userId: string) {
    return doc(this.db, this.collectionName, userId);
  }

  // Agregar un nuevo alimento prohibido por usuario específico (asociado al uid)
  async addProhibitedFood(userId: string, prohibitedFood: ProhibitedFood): Promise<void> {
    try {
      const userDocRef = this.getUserDocRef(userId);

      // Usar setDoc con merge: true garantiza crear o actualizar el array 'foods' atómicamente
      await setDoc(
        userDocRef,
        {
          foods: arrayUnion(prohibitedFood.name)
        },
        { merge: true }
      );

      console.log(`Alimento "${prohibitedFood.name}" agregado a prohibited-food/${userId}`);
    } catch (error) {
      console.error('Error al agregar alimento prohibido:', error);
      throw error;
    }
  }

  // Obtener alimentos prohibidos por usuario específico
  async getProhibitedFoodsByUser(userId: string): Promise<ProhibitedFood[]> {
    try {
      const userDocRef = this.getUserDocRef(userId);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserProhibitedFoods;
        return data.foods.map(foodName => ({ name: foodName }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error al obtener alimentos prohibidos del usuario:', error);
      throw error;
    }
  }

  // Eliminar un alimento prohibido por usuario específico
  async deleteProhibitedFood(userId: string, foodName: string): Promise<void> {
    try {
      const userDocRef = this.getUserDocRef(userId);

      await updateDoc(userDocRef, {
        foods: arrayRemove(foodName)
      });

      console.log(`Alimento "${foodName}" eliminado del array`);
    } catch (error) {
      console.error('Error al eliminar alimento prohibido:', error);
      throw error;
    }
  }
}
