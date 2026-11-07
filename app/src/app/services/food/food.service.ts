import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

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
    return this._httpClient.post<{ result: string }>('https://nutritioncoachflowfunction-f3vjjpbx5q-uc.a.run.app', payload);
  }
}