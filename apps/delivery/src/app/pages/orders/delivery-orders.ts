import { NgClass } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryApi, DeliveryOrder } from '@cafeqr/api-client';

@Component({
  selector: 'app-delivery-orders',
  imports: [NgClass, FormsModule],
  templateUrl: './delivery-orders.html',
})
export class DeliveryOrdersPage implements OnInit, OnDestroy {
  private readonly deliveryApi = inject(DeliveryApi);

  readonly orders = signal<DeliveryOrder[]>([]);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly busy = signal<Set<string>>(new Set());

  readonly deliverOrder = signal<DeliveryOrder | null>(null);
  readonly cashCollected = signal('0.00');
  readonly deliverError = signal<string | null>(null);
  readonly submittingDeliver = signal(false);

  private readonly refreshTimer = setInterval(() => this.loadOrders(), 20_000);

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
  }

  loadOrders(): void {
    if (this.orders().length === 0) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    this.error.set(null);

    this.deliveryApi.listOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las entregas.');
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  start(order: DeliveryOrder): void {
    if (this.busy().has(order.orderId)) {
      return;
    }

    this.busy.update((current) => new Set(current).add(order.orderId));
    this.success.set(null);

    this.deliveryApi.start(order.orderId).subscribe({
      next: () => {
        this.clearBusy(order.orderId);
        this.success.set(`Salida registrada para ${order.codigoPublico}.`);
        this.loadOrders();
      },
      error: (error) => {
        this.clearBusy(order.orderId);
        this.error.set(this.message(error, 'No se pudo registrar la salida.'));
      },
    });
  }

  openDeliver(order: DeliveryOrder): void {
    this.deliverOrder.set(order);
    this.cashCollected.set(
      order.estadoPago === 'pagado' ? '0.00' : order.total,
    );
    this.deliverError.set(null);
    this.success.set(null);
  }

  closeDeliver(): void {
    if (!this.submittingDeliver()) {
      this.deliverOrder.set(null);
      this.deliverError.set(null);
    }
  }

  confirmDeliver(): void {
    const order = this.deliverOrder();

    if (!order || this.submittingDeliver()) {
      return;
    }

    const cash = Number(this.cashCollected());

    if (!Number.isFinite(cash) || cash < 0) {
      this.deliverError.set('Ingrese un monto de efectivo válido.');
      return;
    }

    this.submittingDeliver.set(true);
    this.deliverError.set(null);

    this.deliveryApi
      .deliver(order.orderId, {
        ...(order.estadoPago !== 'pagado'
          ? { efectivoCobrado: cash.toFixed(2) }
          : {}),
      })
      .subscribe({
        next: () => {
          this.deliverOrder.set(null);
          this.submittingDeliver.set(false);
          this.success.set(
            `Entrega completada para ${order.codigoPublico}.`,
          );
          this.loadOrders();
        },
        error: (error) => {
          this.deliverError.set(
            this.message(error, 'No se pudo confirmar la entrega.'),
          );
          this.submittingDeliver.set(false);
        },
      });
  }

  isBusy(orderId: string): boolean {
    return this.busy().has(orderId);
  }

  canStart(order: DeliveryOrder): boolean {
    return (
      order.estadoCumplimiento === 'listo' &&
      !order.salidaEn &&
      !order.entregadoEn
    );
  }

  canDeliver(order: DeliveryOrder): boolean {
    return Boolean(order.salidaEn) && !order.entregadoEn;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      listo: 'Listo para salir',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
    };

    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    const base = 'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ';

    if (status === 'listo') {
      return base + 'bg-lettuce/10 text-lettuce';
    }

    if (status === 'en_preparacion') {
      return base + 'bg-mustard-100 text-mustard-800';
    }

    return base + 'bg-stone-100 text-stone-600';
  }

  mapsUrl(order: DeliveryOrder): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      order.cliente.direccion ?? '',
    )}`;
  }

  phoneHref(order: DeliveryOrder): string {
    return `tel:${(order.cliente.telefono ?? '').replace(/\s+/g, '')}`;
  }

  itemModifiers(item: DeliveryOrder['items'][number]): string {
    return item.modificadores.map((modifier) => modifier.nombre).join(' · ');
  }

  money(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  formatTime(value: string | null): string {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-CU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private clearBusy(orderId: string): void {
    this.busy.update((current) => {
      const next = new Set(current);
      next.delete(orderId);
      return next;
    });
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
