import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FoodService {
  private readonly _httpClient = inject(HttpClient);

  getRecipesByIngredient(payload: any) {
    return this._httpClient.post('https://foodsuggestionflowfunction-v4bqo3zpna-uc.a.run.app', payload);
  }

  generatedRecipes() {
    return this._httpClient.get('https://listfoodssuggestionflowfunction-v4bqo3zpna-uc.a.run.app');
  }
}
