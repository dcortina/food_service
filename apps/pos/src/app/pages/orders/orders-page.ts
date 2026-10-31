import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  Courier,
  DeliveryApi,
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
  private readonly deliveryApi = inject(DeliveryApi);
  private readonly auth = inject(AuthService);

  readonly canConfirm = computed(() =>
    this.auth.hasPermission(PERMISSIONS.PEDIDO_CREAR),
  );

  readonly canAssign = computed(() =>
    this.auth.hasPermission(PERMISSIONS.REPARTIDOR_ASIGNAR),
  );

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly filter = signal<OrderFilter>('active');
  readonly paymentOrder = signal<Order | null>(null);
  readonly confirming = signal<Set<string>>(new Set());

  readonly couriers = signal<Courier[]>([]);
  readonly assignOrder = signal<Order | null>(null);
  readonly assignCourierId = signal<string | null>(null);
  readonly assigning = signal(false);
  readonly assignError = signal<string | null>(null);

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

  isDelivery(order: Order): boolean {
    return order.tipoServicio === 'domicilio' || order.canal === 'domicilio';
  }

  canAssignOrder(order: Order): boolean {
    return (
      this.canAssign() &&
      this.isDelivery(order) &&
      ['confirmado', 'en_preparacion', 'listo'].includes(
        order.estadoCumplimiento,
      )
    );
  }

  openAssign(order: Order): void {
    if (!this.canAssignOrder(order)) {
      return;
    }

    this.assignError.set(null);
    this.success.set(null);

    if (this.couriers().length) {
      this.assignOrder.set(order);
      this.assignCourierId.set(this.couriers()[0]?.id ?? null);
      return;
    }

    this.deliveryApi.listCouriers().subscribe({
      next: (couriers) => {
        this.couriers.set(couriers);
        this.assignOrder.set(order);
        this.assignCourierId.set(couriers[0]?.id ?? null);
      },
      error: () => {
        this.error.set('No se pudieron cargar los repartidores.');
      },
    });
  }

  closeAssign(): void {
    if (!this.assigning()) {
      this.assignOrder.set(null);
      this.assignError.set(null);
    }
  }

  confirmAssign(): void {
    const order = this.assignOrder();
    const courierId = this.assignCourierId();

    if (!order || !courierId || this.assigning()) {
      return;
    }

    this.assigning.set(true);
    this.assignError.set(null);

    this.deliveryApi.assign(order.id, courierId).subscribe({
      next: () => {
        this.assigning.set(false);
        this.assignOrder.set(null);
        this.success.set(`Pedido ${order.codigoPublico} asignado al repartidor.`);
        this.load();
      },
      error: (error) => {
        this.assignError.set(
          this.message(error, 'No se pudo asignar el pedido.'),
        );
        this.assigning.set(false);
      },
    });
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
          ? { ...order, estadoPago: payment.pedido.estadoPago }
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

  private message(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: string | string[] } })
      ?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return typeof message === 'string' && message ? message : fallback;
  }
}
