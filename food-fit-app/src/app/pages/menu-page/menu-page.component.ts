import { Component, inject } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
@Component({
  selector: 'app-menu-page',
  imports: [HeaderComponent, RouterLink],
  templateUrl: './menu-page.component.html',
  styleUrl: './menu-page.component.scss'
})
export class MenuPageComponent {
  username: string = null;
  uuid: string = null;
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    const storedUsername = localStorage.getItem('USER_INFO');
    if (storedUsername) {
      this.username = JSON.parse(storedUsername).displayName;
      this.uuid = JSON.parse(storedUsername).uid;
    }
  }

  logOut() {
    localStorage.removeItem('USER_INFO');
    this.authService.logOut();
    this.router.navigate(['/']);
  }
}
