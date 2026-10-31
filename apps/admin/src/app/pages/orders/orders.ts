import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Order, OrdersApi } from '@cafeqr/api-client';
import {
  CANAL_PEDIDO_LABELS,
  ESTADO_CUMPLIMIENTO_LABELS,
  CanalPedido,
  EstadoCumplimiento,
} from '@cafeqr/shared';

type OrderFilter =
  | 'all'
  | 'nuevo'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

@Component({
  selector: 'app-admin-orders-page',
  imports: [NgClass],
  templateUrl: './orders.html',
})
export class AdminOrdersPage implements OnInit {
  private readonly ordersApi = inject(OrdersApi);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly filter = signal<OrderFilter>('all');

  readonly filters: Array<{ value: OrderFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'nuevo', label: 'Nuevos' },
    { value: 'confirmado', label: 'Confirmados' },
    { value: 'en_preparacion', label: 'En preparación' },
    { value: 'listo', label: 'Listos' },
    { value: 'entregado', label: 'Entregados' },
    { value: 'cancelado', label: 'Cancelados' },
  ];

  readonly filteredOrders = computed(() => {
    const query = this.search().trim().toLowerCase();
    const filter = this.filter();

    return this.orders().filter((order) => {
      const matchesFilter =
        filter === 'all' || order.estadoCumplimiento === filter;
      const matchesQuery =
        !query ||
        order.codigoPublico.toLowerCase().includes(query) ||
        (order.clienteNombre ?? '').toLowerCase().includes(query) ||
        (order.clienteTelefono ?? '').toLowerCase().includes(query);

      return matchesFilter && matchesQuery;
    });
  });

  readonly activeCount = computed(
    () =>
      this.orders().filter((order) =>
        ['nuevo', 'confirmado', 'en_preparacion', 'listo'].includes(
          order.estadoCumplimiento,
        ),
      ).length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.ordersApi.list({ pageSize: 100 }).subscribe({
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

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setFilter(filter: OrderFilter): void {
    this.filter.set(filter);
  }

  canalLabel(canal: string): string {
    return CANAL_PEDIDO_LABELS[canal as CanalPedido] ?? canal;
  }

  estadoLabel(estado: string): string {
    return ESTADO_CUMPLIMIENTO_LABELS[estado as EstadoCumplimiento] ?? estado;
  }

  paymentLabel(estado: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      parcial: 'Parcial',
      pagado: 'Pagado',
      reembolsado: 'Reembolsado',
    };

    return labels[estado] ?? estado;
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

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CU', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
