import { Component, inject, OnInit } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { FoodService } from '../../services/food.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-list-food-page',
  imports: [HeaderComponent],
  templateUrl: './list-food-page.component.html',
  styleUrl: './list-food-page.component.scss'
})
export class ListFoodPageComponent implements OnInit {
  listFood: any = [];
  isLoading = false;
  private foodService = inject(FoodService);

  ngOnInit(): void {
    this.generateRecipes();
  }

  generateRecipes() {
    this.isLoading = true;
    this.listFood = [];

    this.foodService.generatedRecipes().subscribe((data: any) => {
      this.listFood = data.result.recipes;
      this.isLoading = false;
    });
  }
}