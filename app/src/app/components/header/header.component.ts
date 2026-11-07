import { Component, inject } from '@angular/core';
import { CartService } from '../../services/cart/cart.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  readonly cartService = inject(CartService);
}
