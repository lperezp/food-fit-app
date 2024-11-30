import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  constructor() {
    localStorage.removeItem('LIST_FOOD_BY_INGREDIENT');
    localStorage.removeItem('LIST_FOOD');
  }
}
