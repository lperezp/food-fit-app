import { Component, ElementRef, inject, ViewChild, AfterViewChecked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FoodService, StoreProductCard } from '../../services/food/food.service';
import { AuthService } from '../../services/auth/auth.service';
import { CartService } from '../../services/cart/cart.service';

interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
  time: string;
  products?: StoreProductCard[];
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
  readonly cartService = inject(CartService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  isOpen = signal(false);
  isMaximized = signal(false);
  isLoading = signal(false);
  currentMessage = '';
  shouldScrollToBottom = false;

  messages = signal<ChatMessage[]>([
    {
      sender: 'coach',
      text: '¡Hola! 👋 Soy tu coach nutricional de Food Fit. ¿En qué te puedo ayudar hoy? Puedo sugerirte recetas saludables adaptadas a tus restricciones alimentarias.',
      time: this.getCurrentTimeString()
    }
  ]);

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
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.shouldScrollToBottom = true;
    } else {
      this.cartService.closeCart();
    }
  }

  closeChat() {
    this.isOpen.set(false);
    this.isMaximized.set(false);
    this.cartService.closeCart();
  }

  toggleMaximize() {
    this.isMaximized.update(v => !v);
    this.shouldScrollToBottom = true;
  }

  openCartSummary() {
    this.isOpen.set(true);
    this.cartService.openCart();
  }

  backToChat() {
    this.cartService.closeCart();
    this.shouldScrollToBottom = true;
  }

  sendMessage(textToSend?: string) {
    const text = (textToSend || this.currentMessage).trim();
    if (!text || this.isLoading()) {
      return;
    }

    const time = this.getCurrentTimeString();
    this.messages.update(msgs => [...msgs, { sender: 'user', text, time }]);
    this.currentMessage = '';
    this.isLoading.set(true);
    this.shouldScrollToBottom = true;

    const userId = this.authService.getCurrentUserId() || undefined;

    this.foodService.chatWithNutritionCoach({ data: { message: text, userId } })
      .subscribe({
        next: (response) => {
          const rawResult = response?.result;
          const coachText = typeof rawResult === 'string'
            ? rawResult
            : (rawResult?.text || 'Aquí tienes las recomendaciones:');
          const products = typeof rawResult === 'object' && Array.isArray(rawResult?.products)
            ? rawResult.products
            : undefined;

          this.messages.update(msgs => [
            ...msgs,
            {
              sender: 'coach',
              text: coachText,
              time: this.getCurrentTimeString(),
              products
            }
          ]);
          this.isLoading.set(false);
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          console.error('Error al comunicarse con el coach nutricional:', error);
          this.messages.update(msgs => [
            ...msgs,
            {
              sender: 'coach',
              text: 'Lo siento, hubo un inconveniente al conectar con el servicio. Por favor verifica tu conexión o intenta nuevamente.',
              time: this.getCurrentTimeString()
            }
          ]);
          this.isLoading.set(false);
          this.shouldScrollToBottom = true;
        }
      });
  }

  sendSuggestion(suggestion: string) {
    this.sendMessage(suggestion);
  }

  addProduct(product: StoreProductCard) {
    this.cartService.addProduct(product);
  }

  removeProduct(product: StoreProductCard) {
    this.cartService.decrementProduct(product.productId);
  }

  getProductQty(product: StoreProductCard): number {
    return this.cartService.getQuantity(product.productId);
  }

  getAddedLabel(product: StoreProductCard): string {
    const qty = this.getProductQty(product) || 1;
    return this.cartService.getFormattedPresentationQty(product, qty);
  }

  formatMessage(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
