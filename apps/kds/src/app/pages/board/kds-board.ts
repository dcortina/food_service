import { NgClass } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  KdsApi,
  KdsItemStatus,
  KdsOrder,
  OrderItem,
} from '@cafeqr/api-client';
import {
  CANAL_PEDIDO_LABELS,
  CanalPedido,
} from '@cafeqr/shared';
import { debounceTime } from 'rxjs';
import { KdsRealtimeService } from '../../core/kds-realtime.service';

@Component({
  selector: 'app-kds-board',
  imports: [NgClass],
  templateUrl: './kds-board.html',
})
export class KdsBoardPage implements OnInit, OnDestroy {
  private readonly kdsApi = inject(KdsApi);
  private readonly realtime = inject(KdsRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orders = signal<KdsOrder[]>([]);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly busyItems = signal<Set<string>>(new Set());
  readonly busyOrders = signal<Set<string>>(new Set());
  readonly now = signal(Date.now());

  private readonly clockTimer = setInterval(
    () => this.now.set(Date.now()),
    30_000,
  );

  readonly columns = computed(() => [
    {
      key: 'confirmado',
      title: 'Por iniciar',
      subtitle: 'Confirmados',
      orders: this.orders().filter(
        (order) => order.estadoCumplimiento === 'confirmado',
      ),
      dotClass: 'bg-mustard-400',
    },
    {
      key: 'en_preparacion',
      title: 'En preparación',
      subtitle: 'En cocina',
      orders: this.orders().filter(
        (order) => order.estadoCumplimiento === 'en_preparacion',
      ),
      dotClass: 'bg-brand-500',
    },
    {
      key: 'listo',
      title: 'Listos',
      subtitle: 'Para entregar',
      orders: this.orders().filter(
        (order) => order.estadoCumplimiento === 'listo',
      ),
      dotClass: 'bg-lettuce',
    },
  ]);

  readonly totalItems = computed(() =>
    this.orders().reduce((sum, order) => sum + order.items.length, 0),
  );

  ngOnInit(): void {
    this.loadOrders();
    this.realtime.connect();

    this.realtime.orderChanged$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadOrders());
  }

  ngOnDestroy(): void {
    clearInterval(this.clockTimer);
  }

  loadOrders(): void {
    if (this.orders().length === 0) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    this.error.set(null);

    this.kdsApi.listOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los pedidos de cocina.');
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  updateItem(
    order: KdsOrder,
    item: OrderItem,
    estado: KdsItemStatus,
  ): void {
    if (this.busyItems().has(item.id)) {
      return;
    }

    this.busyItems.update((current) => new Set(current).add(item.id));

    this.kdsApi.updateItemStatus(order.id, item.id, estado).subscribe({
      next: () => {
        this.busyItems.update((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
        this.loadOrders();
      },
      error: () => {
        this.busyItems.update((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
        this.error.set('No se pudo actualizar el ítem.');
      },
    });
  }

  markOrderReady(order: KdsOrder): void {
    if (this.busyOrders().has(order.id)) {
      return;
    }

    this.busyOrders.update((current) => new Set(current).add(order.id));

    this.kdsApi.markOrderReady(order.id).subscribe({
      next: () => {
        this.busyOrders.update((current) => {
          const next = new Set(current);
          next.delete(order.id);
          return next;
        });
        this.loadOrders();
      },
      error: () => {
        this.busyOrders.update((current) => {
          const next = new Set(current);
          next.delete(order.id);
          return next;
        });
        this.error.set('No se pudo marcar el pedido como listo.');
      },
    });
  }

  isItemBusy(itemId: string): boolean {
    return this.busyItems().has(itemId);
  }

  isOrderBusy(orderId: string): boolean {
    return this.busyOrders().has(orderId);
  }

  allReady(order: KdsOrder): boolean {
    return order.items.every((item) => item.estadoItem === 'listo');
  }

  elapsed(order: KdsOrder): number {
    return Math.max(
      0,
      Math.floor((this.now() - new Date(order.creadoEn).getTime()) / 60_000),
    );
  }

  elapsedClass(order: KdsOrder): string {
    const minutes = this.elapsed(order);
    const base =
      'inline-flex items-center rounded-full px-2 py-1 text-[11px] font-black tabular-nums ';

    if (minutes >= 10) {
      return base + 'bg-brand-50 text-brand-700';
    }

    if (minutes >= 5) {
      return base + 'bg-mustard-100 text-mustard-800';
    }

    return base + 'bg-lettuce/10 text-lettuce';
  }

  accentClass(order: KdsOrder): string {
    const minutes = this.elapsed(order);

    if (minutes >= 10) {
      return 'border-l-brand-500';
    }

    if (minutes >= 5) {
      return 'border-l-mustard-400';
    }

    return 'border-l-lettuce';
  }

  canalLabel(canal: string): string {
    return CANAL_PEDIDO_LABELS[canal as CanalPedido] ?? canal;
  }

  modifierNames(item: OrderItem): string {
    return item.modificadores.map((modifier) => modifier.nombre).join(' · ');
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-CU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}
