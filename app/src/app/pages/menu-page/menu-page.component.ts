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
  uid: string = null;
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    const storedUsername = JSON.parse(localStorage.getItem('USER_INFO'));
    console.log(11, storedUsername);

    if (storedUsername) {
      this.username = storedUsername.displayName;
      this.uid = storedUsername.uid;
    }
  }

  logOut() {
    localStorage.removeItem('USER_INFO');
    this.authService.logOut();
    this.router.navigate(['/']);
  }
}
