import { Component, inject, OnInit } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { FoodService } from '../../services/food.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-page',
  imports: [HeaderComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss'
})
export class SearchPageComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private foodService = inject(FoodService);
  private router = inject(Router);

  formSearch: FormGroup = this.formBuilder.group({
    ingredient: ['', Validators.required]
  });
  listFood: any = [];
  isLoading = false;

  ngOnInit(): void {
    const listFood = localStorage.getItem('LIST_FOOD_BY_INGREDIENT');
    if (listFood) {
      this.listFood = JSON.parse(listFood);
    }
  }

  generateRecipesByIngredient() {
    localStorage.removeItem('LIST_FOOD_BY_INGREDIENT');
    this.isLoading = true;
    this.listFood = [];
    const payload = {
      data: {
        ingredient: this.formSearch.value.ingredient,
        quantity_people: 2
      }
    }
    this.foodService.getRecipesByIngredient(payload).subscribe((data: any) => {
      localStorage.setItem('LIST_FOOD_BY_INGREDIENT', JSON.stringify(data.result));
      this.listFood = data.result;
      this.isLoading = false;
    });
  }

  openDetail(item: any) {
    localStorage.setItem('DETAIL_FOOD', JSON.stringify(item));
    this.router.navigate(['/detail-food']);
  }
}
