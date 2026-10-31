import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  Order,
  OrdersApi,
  Payment,
} from '@cafeqr/api-client';
import { AuthService } from '@cafeqr/auth';
import {
  CANAL_PEDIDO_LABELS,
  ESTADO_CUMPLIMIENTO_LABELS,
  PERMISSIONS,
  CanalPedido,
  EstadoCumplimiento,
} from '@cafeqr/shared';
import { PaymentDialog } from '../../shared/payment-dialog';

type OrderFilter = 'active' | 'all';

@Component({
  selector: 'app-orders-page',
  imports: [NgClass, PaymentDialog],
  templateUrl: './orders-page.html',
})
export class OrdersPage implements OnInit {
  private readonly ordersApi = inject(OrdersApi);
  private readonly auth = inject(AuthService);

  readonly canConfirm = computed(() =>
    this.auth.hasPermission(PERMISSIONS.PEDIDO_CREAR),
  );

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<OrderFilter>('active');
  readonly paymentOrder = signal<Order | null>(null);
  readonly confirming = signal<Set<string>>(new Set());

  readonly activeStates = ['nuevo', 'confirmado', 'en_preparacion', 'listo'];

  readonly visibleOrders = computed(() => {
    const filter = this.filter();

    if (filter === 'all') {
      return this.orders();
    }

    return this.orders().filter((order) =>
      this.activeStates.includes(order.estadoCumplimiento),
    );
  });

  readonly activeCount = computed(
    () =>
      this.orders().filter((order) =>
        this.activeStates.includes(order.estadoCumplimiento),
      ).length,
  );

  private readonly paymentLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    pagado: 'Pagado',
    reembolsado: 'Reembolsado',
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.ordersApi.list({ pageSize: 50 }).subscribe({
      next: (response) => {
        this.orders.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los pedidos.');
        this.loading.set(false);
      },
    });
  }

  setFilter(filter: OrderFilter): void {
    this.filter.set(filter);
  }

  openPayment(order: Order): void {
    this.paymentOrder.set(order);
  }

  confirmOrder(order: Order): void {
    if (this.confirming().has(order.id)) {
      return;
    }

    this.confirming.update((current) => new Set(current).add(order.id));

    this.ordersApi.confirm(order.id).subscribe({
      next: (updated) => {
        this.orders.update((orders) =>
          orders.map((current) =>
            current.id === updated.id ? updated : current,
          ),
        );
        this.confirming.update((current) => {
          const next = new Set(current);
          next.delete(order.id);
          return next;
        });
      },
      error: () => {
        this.confirming.update((current) => {
          const next = new Set(current);
          next.delete(order.id);
          return next;
        });
        this.error.set('No se pudo confirmar el pedido.');
      },
    });
  }

  isConfirming(orderId: string): boolean {
    return this.confirming().has(orderId);
  }

  onPaid(payment: Payment): void {
    this.orders.update((orders) =>
      orders.map((order) =>
        order.id === payment.pedido.id
          ? { ...order, estadoPago: 'pagado' }
          : order,
      ),
    );
  }

  onPaymentClosed(): void {
    this.paymentOrder.set(null);
  }

  canalLabel(canal: string): string {
    return CANAL_PEDIDO_LABELS[canal as CanalPedido] ?? canal;
  }

  estadoLabel(estado: string): string {
    return ESTADO_CUMPLIMIENTO_LABELS[estado as EstadoCumplimiento] ?? estado;
  }

  paymentLabel(estado: string): string {
    return this.paymentLabels[estado] ?? estado;
  }

  statusClass(estado: string): string {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-bold ';
    const variants: Record<string, string> = {
      nuevo: 'bg-stone-100 text-stone-600',
      confirmado: 'bg-mustard-100 text-mustard-800',
      en_preparacion: 'bg-mustard-100 text-mustard-800',
      listo: 'bg-lettuce/10 text-lettuce',
      entregado: 'bg-stone-100 text-stone-500',
      cancelado: 'bg-brand-50 text-brand-700',
    };

    return base + (variants[estado] ?? 'bg-stone-100 text-stone-600');
  }

  paymentClass(estado: string): string {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-bold ';
    const variants: Record<string, string> = {
      pendiente: 'bg-mustard-100 text-mustard-800',
      parcial: 'bg-brand-50 text-brand-700',
      pagado: 'bg-lettuce/10 text-lettuce',
      reembolsado: 'bg-stone-100 text-stone-600',
    };

    return base + (variants[estado] ?? 'bg-stone-100 text-stone-600');
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
}
