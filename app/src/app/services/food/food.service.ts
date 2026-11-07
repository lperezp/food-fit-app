import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface StoreProductCard {
  productId: string;
  name: string;
  brand: string;
  category?: string;
  store?: string;
  presentation?: string;
  regularPrice?: string;
  finalPrice?: string;
  discountBadge?: string;
  priceUnitLabel?: string;
  availableUnits?: number;
  imageUrl?: string;
  addedQty?: number;
}

export interface NutritionCoachResult {
  text: string;
  products?: StoreProductCard[];
  a2ui?: unknown[];
}

@Injectable({
  providedIn: 'root'
})
export class FoodService {
  private readonly _httpClient = inject(HttpClient);

  getRecipesByIngredient(payload) {
    return this._httpClient.post('https://foodsuggestionflowfunction-f3vjjpbx5q-uc.a.run.app', payload);
  }

  generatedRecipes() {
    return this._httpClient.get('https://listfoodssuggestionflowfunction-f3vjjpbx5q-uc.a.run.app');
  }

  generatedImageFood(payload) {
    return this._httpClient.post('https://generateimagefoodflowfunction-f3vjjpbx5q-uc.a.run.app', payload);
  }

  generateRecipesWithUserPreferences(payload) {
    return this._httpClient.post('https://foodsuggestionwithprohibitedfoodflowfunction-f3vjjpbx5q-uc.a.run.app', payload);
  }

  chatWithNutritionCoach(payload: { data: { message: string; userId?: string } }) {
    return this._httpClient.post<{ result: string | NutritionCoachResult }>(environment.nutritionCoachUrl, payload);
  }
}