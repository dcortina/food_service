import { NgClass } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import {
  PublicMenu,
  PublicMenuApi,
  PublicMenuModifier,
  PublicMenuModifierGroup,
  PublicMenuProduct,
  PublicOrder,
  PublicOrdersApi,
} from '@cafeqr/api-client';
import { BrandMark } from '@cafeqr/ui';

interface MenuProductView extends PublicMenuProduct {
  categoriaId: string;
  categoriaNombre: string;
}

interface CartItem {
  key: string;
  product: MenuProductView;
  modificadores: PublicMenuModifier[];
  notas: string;
  cantidad: number;
  unitPrice: number;
  total: number;
}

@Component({
  selector: 'app-menu-page',
  imports: [NgClass, FormsModule, BrandMark],
  templateUrl: './menu-page.html',
})
export class MenuPage implements OnInit, OnDestroy {
  private readonly menuApi = inject(PublicMenuApi);
  private readonly ordersApi = inject(PublicOrdersApi);
  private readonly title = inject(Title);

  readonly codigoQr = input.required<string>();

  readonly menu = signal<PublicMenu | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly selectedCategoryId = signal<string | null>(null);

  readonly cart = signal<CartItem[]>([]);
  readonly cartOpen = signal(false);
  readonly customerName = signal('');
  readonly orderNotes = signal('');
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly lastOrder = signal<PublicOrder | null>(null);

  readonly selectedProduct = signal<MenuProductView | null>(null);
  readonly selectedModifiers = signal<Record<string, string[]>>({});
  readonly productQuantity = signal(1);
  readonly productNotes = signal('');
  readonly modifierError = signal<string | null>(null);

  private idempotencyKey = crypto.randomUUID();
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  readonly statusSteps = [
    { key: 'nuevo', label: 'Recibido' },
    { key: 'confirmado', label: 'Confirmado' },
    { key: 'en_preparacion', label: 'En preparación' },
    { key: 'listo', label: 'Listo' },
    { key: 'entregado', label: 'Entregado' },
  ];

  readonly products = computed<MenuProductView[]>(() =>
    (this.menu()?.categorias ?? []).flatMap((category) =>
      category.productos.map((product) => ({
        ...product,
        categoriaId: category.id,
        categoriaNombre: category.nombre,
      })),
    ),
  );

  readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const categoryId = this.selectedCategoryId();

    return this.products().filter((product) => {
      const matchesCategory = !categoryId || product.categoriaId === categoryId;
      const matchesQuery =
        !query ||
        product.nombre.toLowerCase().includes(query) ||
        (product.descripcion ?? '').toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  });

  readonly cartCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.cantidad, 0),
  );

  readonly subtotal = computed(() =>
    this.cart().reduce((sum, item) => sum + item.total, 0),
  );

  readonly currencySymbol = computed(
    () => this.menu()?.negocio.monedaPrincipal.simbolo ?? '$',
  );

  readonly selectedModifierObjects = computed(() => {
    const product = this.selectedProduct();

    if (!product) {
      return [] as PublicMenuModifier[];
    }

    const selection = this.selectedModifiers();

    return product.gruposModificadores.flatMap((group) =>
      (selection[group.id] ?? [])
        .map((id) =>
          group.modificadores.find((modifier) => modifier.id === id),
        )
        .filter((modifier): modifier is PublicMenuModifier =>
          Boolean(modifier),
        ),
    );
  });

  readonly selectedProductTotal = computed(() => {
    const product = this.selectedProduct();

    if (!product) {
      return 0;
    }

    const base = this.productPrice(product);
    const extras = this.selectedModifierObjects().reduce(
      (sum, modifier) => sum + Number(modifier.precioExtra),
      0,
    );

    return (base + extras) * this.productQuantity();
  });

  readonly canAddSelectedProduct = computed(() => {
    const product = this.selectedProduct();

    if (!product) {
      return false;
    }

    const selection = this.selectedModifiers();

    return product.gruposModificadores.every((group) => {
      const count = (selection[group.id] ?? []).length;
      const minimum = group.obligatorio
        ? Math.max(1, group.minSeleccion)
        : group.minSeleccion;

      return count >= minimum && count <= group.maxSeleccion;
    });
  });

  readonly canSubmit = computed(
    () => this.cart().length > 0 && !this.submitting(),
  );

  readonly statusIndex = computed(() => {
    const order = this.lastOrder();

    if (!order) {
      return -1;
    }

    return this.statusSteps.findIndex(
      (step) => step.key === order.estadoCumplimiento,
    );
  });

  ngOnInit(): void {
    this.loadMenu();
    this.restoreOrder();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadMenu(): void {
    this.loading.set(true);
    this.error.set(null);

    this.menuApi.getMenu(this.codigoQr()).subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.loading.set(false);
        this.title.setTitle(`${menu.negocio.nombre} · Menú`);
      },
      error: () => {
        this.error.set(
          'No pudimos abrir el menú. Verifique el QR de la mesa e intente de nuevo.',
        );
        this.loading.set(false);
      },
    });
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  selectCategory(id: string | null): void {
    this.selectedCategoryId.set(id);
  }

  openProduct(product: MenuProductView): void {
    if (!product.disponible) {
      return;
    }

    if (product.gruposModificadores.length === 0) {
      this.addToCart(product, [], 1, '');
      return;
    }

    this.selectedProduct.set(product);
    this.selectedModifiers.set(
      Object.fromEntries(
        product.gruposModificadores.map((group) => [group.id, []]),
      ),
    );
    this.productQuantity.set(1);
    this.productNotes.set('');
    this.modifierError.set(null);
  }

  closeProduct(): void {
    this.selectedProduct.set(null);
    this.modifierError.set(null);
  }

  toggleModifier(
    group: PublicMenuModifierGroup,
    modifierId: string,
  ): void {
    const current = this.selectedModifiers();
    const selected = current[group.id] ?? [];
    let next: string[];

    if (group.tipo === 'unico') {
      next = [modifierId];
    } else if (selected.includes(modifierId)) {
      next = selected.filter((id) => id !== modifierId);
    } else if (selected.length >= group.maxSeleccion) {
      this.modifierError.set(
        `Máximo ${group.maxSeleccion} opciones para ${group.nombre}.`,
      );
      return;
    } else {
      next = [...selected, modifierId];
    }

    this.modifierError.set(null);
    this.selectedModifiers.set({ ...current, [group.id]: next });
  }

  isModifierSelected(groupId: string, modifierId: string): boolean {
    return (this.selectedModifiers()[groupId] ?? []).includes(modifierId);
  }

  decrementProductQuantity(): void {
    this.productQuantity.update((quantity) => Math.max(1, quantity - 1));
  }

  incrementProductQuantity(): void {
    this.productQuantity.update((quantity) => quantity + 1);
  }

  addSelectedProduct(): void {
    const product = this.selectedProduct();

    if (!product || !this.canAddSelectedProduct()) {
      this.modifierError.set('Complete las opciones obligatorias.');
      return;
    }

    this.addToCart(
      product,
      this.selectedModifierObjects(),
      this.productQuantity(),
      this.productNotes(),
    );
    this.closeProduct();
  }

  addToCart(
    product: MenuProductView,
    modifiers: PublicMenuModifier[],
    cantidad: number,
    notas: string,
  ): void {
    const unitPrice =
      this.productPrice(product) +
      modifiers.reduce(
        (sum, modifier) => sum + Number(modifier.precioExtra),
        0,
      );
    const key = [
      product.id,
      ...modifiers.map((modifier) => modifier.id).sort(),
      notas.trim(),
    ].join('|');

    this.cart.update((items) => {
      const index = items.findIndex((item) => item.key === key);

      if (index >= 0) {
        return items.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                cantidad: item.cantidad + cantidad,
                total: item.unitPrice * (item.cantidad + cantidad),
              }
            : item,
        );
      }

      return [
        ...items,
        {
          key,
          product,
          modificadores: modifiers,
          notas: notas.trim(),
          cantidad,
          unitPrice,
          total: unitPrice * cantidad,
        },
      ];
    });
  }

  changeQuantity(item: CartItem, delta: number): void {
    const next = item.cantidad + delta;

    if (next <= 0) {
      this.removeItem(item);
      return;
    }

    this.cart.update((items) =>
      items.map((current) =>
        current.key === item.key
          ? { ...current, cantidad: next, total: current.unitPrice * next }
          : current,
      ),
    );
  }

  removeItem(item: CartItem): void {
    this.cart.update((items) =>
      items.filter((current) => current.key !== item.key),
    );
  }

  openCart(): void {
    this.cartOpen.set(true);
  }

  closeCart(): void {
    this.cartOpen.set(false);
  }

  submitOrder(): void {
    if (!this.canSubmit()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    this.ordersApi
      .create({
        codigoQr: this.codigoQr(),
        items: this.cart().map((item) => ({
          productoId: item.product.id,
          cantidad: item.cantidad,
          modificadores: item.modificadores.map((modifier) => ({
            modificadorId: modifier.id,
          })),
          ...(item.notas ? { notas: item.notas } : {}),
        })),
        ...(this.customerName().trim()
          ? { cliente: { nombre: this.customerName().trim() } }
          : {}),
        ...(this.orderNotes().trim()
          ? { notas: this.orderNotes().trim() }
          : {}),
        idempotencyKey: this.idempotencyKey,
      })
      .subscribe({
        next: (order) => {
          this.lastOrder.set(order);
          this.cart.set([]);
          this.cartOpen.set(false);
          this.customerName.set('');
          this.orderNotes.set('');
          this.submitting.set(false);
          this.idempotencyKey = crypto.randomUUID();
          localStorage.setItem(
            this.storageKey(),
            JSON.stringify({ id: order.id }),
          );
          this.startPolling(order.id);
        },
        error: (error) => {
          this.submitError.set(
            this.message(error, 'No pudimos enviar el pedido.'),
          );
          this.submitting.set(false);
        },
      });
  }

  newOrder(): void {
    this.stopPolling();
    localStorage.removeItem(this.storageKey());
    this.lastOrder.set(null);
    this.cart.set([]);
    this.customerName.set('');
    this.orderNotes.set('');
    this.idempotencyKey = crypto.randomUUID();
    this.submitError.set(null);
  }

  productPrice(product: PublicMenuProduct): number {
    return Number(product.precios[0]?.precio ?? 0);
  }

  modifierNames(item: CartItem): string {
    return item.modificadores.map((modifier) => modifier.nombre).join(' · ');
  }

  money(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      nuevo: 'Recibido',
      confirmado: 'Confirmado por el local',
      en_preparacion: 'En preparación',
      listo: 'Listo para servir',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
    };

    return labels[status] ?? status;
  }

  statusHint(status: string): string {
    const hints: Record<string, string> = {
      nuevo: 'Estamos esperando la confirmación del local.',
      confirmado: 'El local confirmó tu pedido.',
      en_preparacion: 'Tu pedido está en cocina.',
      listo: 'Tu pedido está listo. ¡Buen provecho!',
      entregado: 'Pedido entregado. ¡Gracias por tu compra!',
      cancelado: 'El pedido fue cancelado.',
    };

    return hints[status] ?? '';
  }

  statusClass(status: string): string {
    const base = 'inline-flex rounded-full px-3 py-1 text-xs font-bold ';

    if (status === 'cancelado') {
      return base + 'bg-brand-50 text-brand-700';
    }

    if (status === 'listo' || status === 'entregado') {
      return base + 'bg-lettuce/10 text-lettuce';
    }

    if (status === 'en_preparacion') {
      return base + 'bg-mustard-100 text-mustard-800';
    }

    return base + 'bg-stone-100 text-stone-600';
  }

  stepReached(status: string, index: number): boolean {
    const current = this.statusSteps.findIndex((step) => step.key === status);
    return current >= index;
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-CU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private restoreOrder(): void {
    const raw = localStorage.getItem(this.storageKey());

    if (!raw) {
      return;
    }

    try {
      const stored = JSON.parse(raw) as { id?: string };

      if (!stored.id) {
        localStorage.removeItem(this.storageKey());
        return;
      }

      this.ordersApi.status(stored.id, this.codigoQr()).subscribe({
        next: (order) => {
          this.lastOrder.set(order);

          if (
            !['entregado', 'cancelado'].includes(order.estadoCumplimiento)
          ) {
            this.startPolling(order.id);
          }
        },
        error: () => localStorage.removeItem(this.storageKey()),
      });
    } catch {
      localStorage.removeItem(this.storageKey());
    }
  }

  private storageKey(): string {
    return `menu-order:${this.codigoQr()}`;
  }

  private startPolling(orderId: string): void {
    this.stopPolling();

    this.pollingTimer = setInterval(() => {
      this.ordersApi.status(orderId, this.codigoQr()).subscribe({
        next: (order) => {
          this.lastOrder.set(order);

          if (['entregado', 'cancelado'].includes(order.estadoCumplimiento)) {
            this.stopPolling();
          }
        },
        error: () => undefined,
      });
    }, 10_000);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private message(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: string | string[] } })
      ?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return typeof message === 'string' && message ? message : fallback;
  }
}
