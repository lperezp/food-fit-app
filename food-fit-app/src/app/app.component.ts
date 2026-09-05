import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ChatCoachComponent } from './components/chat-coach/chat-coach.component';
import { AuthService } from './services/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatCoachComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'food-fit-app';
  private router = inject(Router);
  private authService = inject(AuthService);

  currentUrl = signal<string>(this.router.url);

  showCoachBubble = computed(() => {
    const url = this.currentUrl();
    const cleanUrl = (url || '').split('?')[0].split('#')[0];
    const isRoot = !cleanUrl || cleanUrl === '/' || cleanUrl === '';
    return !isRoot && !!this.authService.currentUser();
  });

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.currentUrl.set(event.urlAfterRedirects);
    });
  }
}
