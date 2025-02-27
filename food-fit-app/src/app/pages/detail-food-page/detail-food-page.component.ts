import { Component, inject } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { FoodService } from '../../services/food.service';

@Component({
  selector: 'app-detail-food-page',
  imports: [HeaderComponent],
  templateUrl: './detail-food-page.component.html',
  styleUrl: './detail-food-page.component.scss'
})
export class DetailFoodPageComponent {
  detailFood;
  private foodService = inject(FoodService);
  constructor() {
    const detailFoodString = localStorage.getItem('DETAIL_FOOD');
    this.detailFood = detailFoodString ? JSON.parse(detailFoodString) : null;
    this.generatedImageFood(this.detailFood.name);
  }

  generatedImageFood(name) {
    const payload = {
      data: {
        food: name
      }
    }

    this.foodService.generatedImageFood(payload).subscribe((data) => {
      this.detailFood.image = data["result"].url;
    });
  }
}
