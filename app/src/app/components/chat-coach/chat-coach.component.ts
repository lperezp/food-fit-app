import { Component, ElementRef, inject, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FoodService } from '../../services/food/food.service';
import { AuthService } from '../../services/auth/auth.service';

interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
  time: string;
}

@Component({
  selector: 'app-chat-coach',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-coach.component.html',
  styleUrl: './chat-coach.component.scss'
})
export class ChatCoachComponent implements AfterViewChecked {
  private foodService = inject(FoodService);
  private authService = inject(AuthService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  isOpen = false;
  isLoading = false;
  currentMessage = '';
  shouldScrollToBottom = false;

  messages: ChatMessage[] = [
    {
      sender: 'coach',
      text: '¡Hola! 👋 Soy tu coach nutricional de Food Fit. ¿En qué te puedo ayudar hoy? Puedo sugerirte recetas saludables adaptadas a tus restricciones alimentarias.',
      time: this.getCurrentTimeString()
    }
  ];

  suggestedQuestions = [
    '¿Qué puedo cocinar hoy con pollo?',
    'Recomiéndame un desayuno saludable',
    'Ideas para una cena baja en calorías'
  ];

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.shouldScrollToBottom = true;
    }
  }

  closeChat() {
    this.isOpen = false;
  }

  sendMessage(textToSend?: string) {
    const text = (textToSend || this.currentMessage).trim();
    if (!text || this.isLoading) {
      return;
    }

    const time = this.getCurrentTimeString();
    this.messages.push({ sender: 'user', text, time });
    this.currentMessage = '';
    this.isLoading = true;
    this.shouldScrollToBottom = true;

    const userId = this.authService.getCurrentUserId() || undefined;

    this.foodService.chatWithNutritionCoach({ data: { message: text, userId } })
      .subscribe({
        next: (response) => {
          const coachText = response?.result || 'No pude obtener respuesta del coach en este momento.';
          this.messages.push({
            sender: 'coach',
            text: coachText,
            time: this.getCurrentTimeString()
          });
          this.isLoading = false;
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          console.error('Error al comunicarse con el coach nutricional:', error);
          this.messages.push({
            sender: 'coach',
            text: 'Lo siento, hubo un inconveniente al conectar con el servicio. Por favor verifica tu conexión o intenta nuevamente.',
            time: this.getCurrentTimeString()
          });
          this.isLoading = false;
          this.shouldScrollToBottom = true;
        }
      });
  }

  sendSuggestion(suggestion: string) {
    this.sendMessage(suggestion);
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.warn('Scroll error:', err);
    }
  }

  private getCurrentTimeString(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
