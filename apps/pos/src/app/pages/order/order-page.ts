import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@cafeqr/auth';
import {
  CanalPedido,
  PERMISSIONS,
  TipoServicio,
} from '@cafeqr/shared';
import {
  CatalogApi,
  Category,
  CreateOrderPayload,
  Modifier,
  ModifierGroup,
  Order,
  OrdersApi,
  Payment,
  Product,
  RestaurantTable,
  TablesApi,
} from '@cafeqr/api-client';
import { forkJoin, switchMap } from 'rxjs';
import { PaymentDialog } from '../../shared/payment-dialog';

interface CartItem {
  key: string;
  product: Product;
  modificadores: Modifier[];
  notas: string;
  cantidad: number;
  unitPrice: number;
  total: number;
}

interface ServiceOption {
  value: TipoServicio;
  label: string;
}

@Component({
  selector: 'app-order-page',
  imports: [NgClass, FormsModule, RouterLink, PaymentDialog],
  templateUrl: './order-page.html',
})
export class OrderPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly catalogApi = inject(CatalogApi);
  private readonly tablesApi = inject(TablesApi);
  private readonly ordersApi = inject(OrdersApi);

  readonly canCreate = computed(() =>
    this.auth.hasPermission(PERMISSIONS.PEDIDO_CREAR),
  );

  readonly canDiscount = computed(() =>
    this.auth.hasPermission(PERMISSIONS.PEDIDO_DESCUENTO),
  );

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly tables = signal<RestaurantTable[]>([]);
  readonly loadingCatalog = signal(true);
  readonly loadingTables = signal(true);
  readonly catalogError = signal<string | null>(null);

  readonly search = signal('');
  readonly selectedCategoryId = signal<string | null>(null);
  readonly serviceType = signal<TipoServicio>('mostrador');
  readonly channelOverride = signal<
    '' | 'whatsapp' | 'instagram' | 'facebook'
  >('');
  readonly selectedTableId = signal<string | null>(null);
  readonly customerName = signal('');
  readonly customerPhone = signal('');
  readonly customerAddress = signal('');
  readonly orderNotes = signal('');
  readonly discount = signal('');

  readonly cart = signal<CartItem[]>([]);
  readonly selectedProduct = signal<Product | null>(null);
  readonly selectedModifiers = signal<Record<string, string[]>>({});
  readonly productQuantity = signal(1);
  readonly productNotes = signal('');
  readonly modifierError = signal<string | null>(null);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastOrder = signal<Order | null>(null);
  readonly paymentOpen = signal(false);

  private idempotencyKey = crypto.randomUUID();

  readonly serviceOptions: ServiceOption[] = [
    { value: 'mostrador', label: 'Mostrador' },
    { value: 'mesa', label: 'Mesa' },
    { value: 'para_llevar', label: 'Para llevar' },
    { value: 'domicilio', label: 'Domicilio' },
  ];

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

  readonly tableGroups = computed(() => {
    const groups = new Map<string, RestaurantTable[]>();

    for (const table of this.tables()) {
      const zone = table.zona.nombre;
      const list = groups.get(zone) ?? [];
      list.push(table);
      groups.set(zone, list);
    }

    return Array.from(groups, ([zone, tables]) => ({ zone, tables }));
  });

  readonly selectedTable = computed(
    () =>
      this.tables().find((table) => table.id === this.selectedTableId()) ??
      null,
  );

  readonly cartCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.cantidad, 0),
  );

  readonly subtotal = computed(() =>
    this.cart().reduce((sum, item) => sum + item.total, 0),
  );

  readonly discountValue = computed(() =>
    Math.min(
      Math.max(0, Number(this.discount() || 0)),
      this.subtotal(),
    ),
  );

  readonly total = computed(() =>
    Math.max(0, this.subtotal() - this.discountValue()),
  );

  readonly selectedModifierObjects = computed(() => {
    const product = this.selectedProduct();

    if (!product) {
      return [] as Modifier[];
    }

    const selection = this.selectedModifiers();

    return product.gruposModificadores.flatMap((group) =>
      (selection[group.id] ?? [])
        .map((id) => group.modificadores.find((modifier) => modifier.id === id))
        .filter((modifier): modifier is Modifier => Boolean(modifier)),
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
      const minimum = group.obligatorio ? Math.max(1, group.minSeleccion) : group.minSeleccion;

      return count >= minimum && count <= group.maxSeleccion;
    });
  });

  readonly canSubmit = computed(
    () =>
      this.canCreate() &&
      this.cart().length > 0 &&
      !this.saving() &&
      (this.serviceType() !== 'mesa' || Boolean(this.selectedTableId())) &&
      (this.serviceType() !== 'domicilio' ||
        (Boolean(this.customerName().trim()) &&
          Boolean(this.customerPhone().trim()) &&
          Boolean(this.customerAddress().trim()))),
  );

  ngOnInit(): void {
    this.loadCatalog();
    this.loadTables();
  }

  loadCatalog(): void {
    this.loadingCatalog.set(true);
    this.catalogError.set(null);

    forkJoin({
      categories: this.catalogApi.listCategories(),
      products: this.catalogApi.listProducts({ pageSize: 100 }),
    }).subscribe({
      next: ({ categories, products }) => {
        this.categories.set(categories.filter((category) => category.activo));
        this.products.set(products.data);
        this.loadingCatalog.set(false);
      },
      error: () => {
        this.catalogError.set('No se pudo cargar el catálogo.');
        this.loadingCatalog.set(false);
      },
    });
  }

  loadTables(): void {
    this.loadingTables.set(true);

    this.tablesApi
      .listTables({ estado: 'libre', activo: 'true', pageSize: 100 })
      .subscribe({
        next: (response) => {
          this.tables.set(response.data);
          this.loadingTables.set(false);
        },
        error: () => {
          this.tables.set([]);
          this.loadingTables.set(false);
        },
      });
  }

  setServiceType(type: TipoServicio): void {
    this.serviceType.set(type);

    if (type !== 'mesa') {
      this.selectedTableId.set(null);
    } else {
      this.channelOverride.set('');
    }

    this.error.set(null);
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  selectCategory(id: string | null): void {
    this.selectedCategoryId.set(id);
  }

  openProduct(product: Product): void {
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

  toggleModifier(group: ModifierGroup, modifierId: string): void {
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
    product: Product,
    modifiers: Modifier[],
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

    this.lastOrder.set(null);
    this.error.set(null);
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
    this.cart.update((items) => items.filter((current) => current.key !== item.key));
  }

  clearCart(): void {
    this.cart.set([]);
    this.orderNotes.set('');
    this.discount.set('');
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const service = this.serviceType();

    if (service === 'mesa' && !this.selectedTableId()) {
      this.error.set('Seleccione una mesa libre.');
      return;
    }

    if (
      service === 'domicilio' &&
      (!this.customerName().trim() ||
        !this.customerPhone().trim() ||
        !this.customerAddress().trim())
    ) {
      this.error.set('Complete el nombre, teléfono y dirección de entrega.');
      return;
    }

    const defaultChannel: CanalPedido =
      service === 'mesa'
        ? 'mesa_mesero'
        : service === 'domicilio'
          ? 'domicilio'
          : service === 'para_llevar'
            ? 'para_llevar'
            : 'mostrador';
    const canal: CanalPedido =
      service !== 'mesa' && this.channelOverride()
        ? (this.channelOverride() as CanalPedido)
        : defaultChannel;
    const discountValue = this.discountValue();

    if (Number(this.discount() || 0) > this.subtotal() + 0.001) {
      this.error.set('El descuento no puede superar el subtotal.');
      return;
    }

    const payload: CreateOrderPayload = {
      canal,
      tipoServicio: service,
      items: this.cart().map((item) => ({
        productoId: item.product.id,
        cantidad: item.cantidad,
        modificadores: item.modificadores.map((modifier) => ({
          modificadorId: modifier.id,
        })),
        ...(item.notas ? { notas: item.notas } : {}),
      })),
      ...(service === 'mesa' && this.selectedTableId()
        ? { mesaId: this.selectedTableId()! }
        : {}),
      ...(this.customerName().trim() ||
      this.customerPhone().trim() ||
      this.customerAddress().trim()
        ? {
            cliente: {
              ...(this.customerName().trim()
                ? { nombre: this.customerName().trim() }
                : {}),
              ...(this.customerPhone().trim()
                ? { telefono: this.customerPhone().trim() }
                : {}),
              ...(this.customerAddress().trim()
                ? { direccion: this.customerAddress().trim() }
                : {}),
            },
          }
        : {}),
      ...(this.orderNotes().trim() ? { notas: this.orderNotes().trim() } : {}),
      ...(this.canDiscount() && discountValue > 0
        ? { descuento: discountValue.toFixed(2) }
        : {}),
      idempotencyKey: this.idempotencyKey,
    };

    this.saving.set(true);
    this.error.set(null);

    this.ordersApi
      .create(payload)
      .pipe(switchMap((order) => this.ordersApi.confirm(order.id)))
      .subscribe({
        next: (order) => {
          this.lastOrder.set(order);
          this.cart.set([]);
          this.orderNotes.set('');
          this.selectedTableId.set(null);
          this.serviceType.set('mostrador');
          this.customerName.set('');
          this.customerPhone.set('');
          this.customerAddress.set('');
          this.channelOverride.set('');
          this.discount.set('');
          this.idempotencyKey = crypto.randomUUID();
          this.saving.set(false);
          this.loadTables();
        },
        error: (error) => {
          this.error.set(
            this.message(error, 'No se pudo confirmar el pedido.'),
          );
          this.saving.set(false);
        },
      });
  }

  startNewOrder(): void {
    this.lastOrder.set(null);
    this.cart.set([]);
    this.orderNotes.set('');
    this.selectedTableId.set(null);
    this.serviceType.set('mostrador');
    this.customerName.set('');
    this.customerPhone.set('');
    this.customerAddress.set('');
    this.channelOverride.set('');
    this.discount.set('');
    this.idempotencyKey = crypto.randomUUID();
    this.error.set(null);
  }

  openPayment(): void {
    if (this.lastOrder()) {
      this.paymentOpen.set(true);
    }
  }

  onPaymentCompleted(payment: Payment): void {
    this.lastOrder.update((order) =>
      order
        ? { ...order, estadoPago: payment.pedido.estadoPago }
        : order,
    );
  }

  onPaymentClosed(): void {
    this.paymentOpen.set(false);
  }

  productPrice(product: Product): number {
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

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-CU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
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
