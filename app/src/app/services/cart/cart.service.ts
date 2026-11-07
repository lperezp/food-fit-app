import { Injectable, computed, inject, signal } from '@angular/core';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import app from '../../config/firebase.config';
import { AuthService } from '../auth/auth.service';
import { StoreProductCard } from '../food/food.service';

export interface CartItem extends StoreProductCard {
  quantity: number;
  unitRegularPrice: number;
  unitFinalPrice: number;
}

export interface GPayCardOption {
  id: string;
  brand: 'VISA' | 'MASTERCARD';
  label: string;
  last4: string;
}

export interface OrderReceipt {
  orderCode: string;
  firestorePath: string;
  total: number;
  discount: number;
  itemsCount: number;
  paymentMethodLabel: string;
  purchasedItems: string[];
  createdAt: string;
  orderPayload?: Record<string, unknown>;
}

const CART_STORAGE_KEY = 'genkit_store_cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly db = getFirestore(app);
  private readonly authService = inject(AuthService);

  readonly items = signal<CartItem[]>(this.loadFromStorage());
  readonly isCartOpen = signal(false);
  readonly isGPaySheetOpen = signal(false);
  readonly isProcessingPayment = signal(false);
  readonly orderSuccess = signal<OrderReceipt | null>(null);

  readonly gPayCards: GPayCardOption[] = [
    { id: 'visa-4242', brand: 'VISA', label: 'Visa Débito', last4: '4242' },
    { id: 'mc-8890', brand: 'MASTERCARD', label: 'Mastercard Crédito', last4: '8890' },
  ];

  readonly selectedCard = signal<GPayCardOption>(this.gPayCards[0]);

  readonly totalItemsCount = computed(() =>
    this.items().reduce((acc, item) => acc + item.quantity, 0)
  );

  readonly subtotalRegular = computed(() =>
    this.items().reduce((acc, item) => acc + item.unitRegularPrice * item.quantity, 0)
  );

  readonly totalFinal = computed(() =>
    this.items().reduce((acc, item) => acc + item.unitFinalPrice * item.quantity, 0)
  );

  readonly totalDiscount = computed(() =>
    Math.max(0, this.subtotalRegular() - this.totalFinal())
  );

  openCart(): void {
    this.orderSuccess.set(null);
    this.isGPaySheetOpen.set(false);
    this.isCartOpen.set(true);
  }

  closeCart(): void {
    this.isGPaySheetOpen.set(false);
    this.isCartOpen.set(false);
  }

  clearOrderSuccess(): void {
    this.orderSuccess.set(null);
  }

  toggleCart(): void {
    if (!this.isCartOpen()) {
      this.orderSuccess.set(null);
      this.isGPaySheetOpen.set(false);
    }
    this.isCartOpen.update(v => !v);
  }

  selectGPayCard(card: GPayCardOption): void {
    this.selectedCard.set(card);
  }

  openGPaySheet(): void {
    if (this.totalItemsCount() === 0) return;
    this.isGPaySheetOpen.set(true);
  }

  closeGPaySheet(): void {
    if (this.isProcessingPayment()) return;
    this.isGPaySheetOpen.set(false);
  }

  getQuantity(productId: string): number {
    return this.items().find(i => i.productId === productId)?.quantity ?? 0;
  }

  addProduct(product: StoreProductCard): void {
    const unitFinal = this.parsePrice(product.finalPrice);
    const unitRegular = this.parsePrice(product.regularPrice) || unitFinal;

    this.items.update(current => {
      const idx = current.findIndex(i => i.productId === product.productId);
      let updated: CartItem[];
      if (idx >= 0) {
        updated = current.map((item, i) =>
          i === idx ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updated = [
          ...current,
          {
            ...product,
            quantity: 1,
            unitRegularPrice: unitRegular,
            unitFinalPrice: unitFinal,
          }
        ];
      }
      this.saveToStorage(updated);
      return updated;
    });
  }

  decrementProduct(productId: string): void {
    this.items.update(current => {
      const existing = current.find(i => i.productId === productId);
      if (!existing) return current;

      let updated: CartItem[];
      if (existing.quantity <= 1) {
        updated = current.filter(i => i.productId !== productId);
      } else {
        updated = current.map(item =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      this.saveToStorage(updated);
      return updated;
    });
  }

  removeItem(productId: string): void {
    this.items.update(current => {
      const updated = current.filter(i => i.productId !== productId);
      this.saveToStorage(updated);
      return updated;
    });
  }

  clearCart(): void {
    this.items.set([]);
    this.saveToStorage([]);
  }

  async confirmGPayPayment(): Promise<void> {
    const currentItems = this.items();
    const total = Number(this.totalFinal().toFixed(2));
    const subtotalReg = Number(this.subtotalRegular().toFixed(2));
    const discount = Number(this.totalDiscount().toFixed(2));
    const itemsCount = this.totalItemsCount();

    if (itemsCount === 0 || this.isProcessingPayment()) return;

    this.isProcessingPayment.set(true);

    const orderCode = 'GK-' + Math.floor(100000 + Math.random() * 900000);
    const card = this.selectedCard();
    const user = this.authService.getCurrentUser();
    const createdAt = new Date().toISOString();

    const orderPayload = {
      orderCode,
      userId: user?.uid || 'anonymous',
      userEmail: user?.email || 'invitado@foodfit.pe',
      userName: user?.displayName || 'Usuario Food Fit',
      store: 'Genkit Store',
      paymentMethod: 'GOOGLE_PAY',
      cardBrand: card.brand,
      cardLast4: card.last4,
      status: 'PAID',
      currency: 'PEN',
      itemsCount,
      subtotalRegular: subtotalReg,
      totalDiscount: discount,
      totalFinal: total,
      items: currentItems.map(item => ({
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        presentation: item.presentation || '',
        imageUrl: item.imageUrl || '',
        quantity: item.quantity,
        unitRegularPrice: item.unitRegularPrice,
        unitFinalPrice: item.unitFinalPrice,
        subtotal: Number((item.unitFinalPrice * item.quantity).toFixed(2)),
      })),
      createdAt,
    };

    try {
      await new Promise(resolve => setTimeout(resolve, 850));
      const orderRef = doc(this.db, 'orders', orderCode);
      await setDoc(orderRef, orderPayload);
      console.log(`Orden guardada en Firestore: orders/${orderCode}`);
    } catch (error) {
      console.warn('Aviso al guardar la orden en Firestore (continuando confirmación local):', error);
    } finally {
      this.isProcessingPayment.set(false);
      this.isGPaySheetOpen.set(false);
      this.clearCart();
      this.orderSuccess.set({
        orderCode,
        firestorePath: `orders/${orderCode}`,
        total,
        discount,
        itemsCount,
        paymentMethodLabel: `G Pay • ${card.brand} •••• ${card.last4}`,
        purchasedItems: currentItems.map(i => `${i.name} (${this.getFormattedPresentationQty(i, i.quantity)})`),
        createdAt,
        orderPayload,
      });
    }
  }

  getFormattedPresentationQty(item: { presentation?: string }, qty: number): string {
    if (item.presentation) {
      const match = item.presentation.match(/([\d.]+)\s*(kg|gr|lt|ml)/i);
      if (match) {
        const base = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        const total = Math.round(base * qty * 100) / 100;
        return `${total}${unit}`;
      }
    }
    return `${qty} un`;
  }

  private parsePrice(priceStr?: string): number {
    if (!priceStr) return 0;
    const cleaned = priceStr.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Error guardando carrito en localStorage:', e);
    }
  }
}
