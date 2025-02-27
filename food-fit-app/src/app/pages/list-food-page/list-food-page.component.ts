import { Component, inject, OnInit } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { FoodService } from '../../services/food.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-list-food-page',
  imports: [HeaderComponent],
  templateUrl: './list-food-page.component.html',
  styleUrl: './list-food-page.component.scss'
})
export class ListFoodPageComponent implements OnInit {
  listFood = [];
  isLoading = false;
  private foodService = inject(FoodService);
  private router = inject(Router);

  ngOnInit(): void {
    const listFood = localStorage.getItem('LIST_FOOD');
    if (listFood) {
      this.listFood = JSON.parse(listFood);
    } else {
      this.generateRecipes();
    }
  }

  generateRecipes() {
    localStorage.removeItem('LIST_FOOD');
    this.isLoading = true;
    this.listFood = [];

    this.foodService.generatedRecipes().subscribe((data) => {
      this.listFood = data['recipes'];
      localStorage.setItem('LIST_FOOD', JSON.stringify(this.listFood));
      this.isLoading = false;
    });
  }

  openDetail(item) {
    localStorage.setItem('DETAIL_FOOD', JSON.stringify(item));
    this.router.navigate(['/detail-food']);
  }
}