import { Injectable, computed, signal } from '@angular/core';
import { StoreProductCard } from '../food/food.service';

export interface CartItem extends StoreProductCard {
  quantity: number;
  unitRegularPrice: number;
  unitFinalPrice: number;
}

const CART_STORAGE_KEY = 'genkit_store_cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  readonly items = signal<CartItem[]>(this.loadFromStorage());
  readonly isCartOpen = signal(false);
  readonly orderSuccess = signal<{ orderCode: string; total: number; itemsCount: number } | null>(null);

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
    this.isCartOpen.set(true);
  }

  closeCart(): void {
    this.isCartOpen.set(false);
  }

  toggleCart(): void {
    if (!this.isCartOpen()) {
      this.orderSuccess.set(null);
    }
    this.isCartOpen.update(v => !v);
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

  checkout(): void {
    const total = this.totalFinal();
    const itemsCount = this.totalItemsCount();
    if (itemsCount === 0) return;

    const randomCode = 'GK-' + Math.floor(100000 + Math.random() * 900000);
    this.clearCart();
    this.orderSuccess.set({
      orderCode: randomCode,
      total,
      itemsCount,
    });
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
