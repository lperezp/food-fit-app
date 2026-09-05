import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatCoachComponent } from './components/chat-coach/chat-coach.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatCoachComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'food-fit-app';
}
