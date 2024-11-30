import { Component } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";

@Component({
  selector: 'app-detail-food-page',
  imports: [HeaderComponent],
  templateUrl: './detail-food-page.component.html',
  styleUrl: './detail-food-page.component.scss'
})
export class DetailFoodPageComponent {
  detailFood: any;
  constructor() {
    const detailFoodString = localStorage.getItem('DETAIL_FOOD');
    this.detailFood = detailFoodString ? JSON.parse(detailFoodString) : null;
  }
}
