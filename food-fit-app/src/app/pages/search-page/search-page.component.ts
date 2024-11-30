import { Component, inject } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { FoodService } from '../../services/food.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-search-page',
  imports: [HeaderComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss'
})
export class SearchPageComponent {
  private formBuilder = inject(FormBuilder);
  private foodService = inject(FoodService);

  formSearch: FormGroup = this.formBuilder.group({
    ingredient: ['', Validators.required]
  });
  listFood: any = [];
  isLoading = false;

  generateRecipesByIngredient() {
    this.isLoading = true;
    this.listFood = [];
    const payload = {
      data: {
        ingredient: this.formSearch.value.ingredient,
        quantity_people: 2
      }
    }
    this.foodService.getRecipesByIngredient(payload).subscribe((data: any) => {
      this.listFood = data.result;
      this.isLoading = false;
    });
  }
}
