import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    localStorage.removeItem('LIST_FOOD_BY_INGREDIENT');
    localStorage.removeItem('LIST_FOOD');
  }

  loginWithGoogle() {
    this.authService.signInWithGoogle()
      .then(({ user, token }) => {
        this.router.navigate(['/menu']);
        localStorage.setItem('USER_INFO', JSON.stringify(user));
      })
      .catch((error) => {
        console.error('Error during sign-in:', error);
      });
  }
}
