import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@cafeqr/auth';
import {
  CANAL_PEDIDO_LABELS,
  ESTADO_CUMPLIMIENTO_LABELS,
  METODO_PAGO_LABELS,
  CanalPedido,
  EstadoCumplimiento,
  MetodoPago,
} from '@cafeqr/shared';
import { DashboardStore } from './dashboard.store';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink],
  providers: [DashboardStore],
  templateUrl: './dashboard.html',
})
export class DashboardPage implements OnInit {
  readonly store = inject(DashboardStore);
  private readonly auth = inject(AuthService);

  desde = this.store.desde();
  hasta = this.store.hasta();

  readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly firstName = computed(
    () => this.auth.user()?.nombre.split(/\s+/)[0] ?? '',
  );

  readonly maxChannel = computed(() =>
    Math.max(
      1,
      ...(this.store.data()?.ventasPorCanal ?? []).map((row) =>
        Number(row.total),
      ),
    ),
  );

  readonly maxMethod = computed(() =>
    Math.max(
      1,
      ...(this.store.data()?.ventasPorMetodo ?? []).map((row) =>
        Number(row.total),
      ),
    ),
  );

  readonly maxHour = computed(() =>
    Math.max(
      1,
      ...(this.store.data()?.ventasPorHora ?? []).map((row) =>
        Number(row.total),
      ),
    ),
  );

  readonly maxCashier = computed(() =>
    Math.max(
      1,
      ...(this.store.data()?.ventasPorCajero ?? []).map((row) =>
        Number(row.total),
      ),
    ),
  );

  private readonly paymentLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    pagado: 'Pagado',
    reembolsado: 'Reembolsado',
  };

  constructor() {
    effect(() => {
      this.desde = this.store.desde();
      this.hasta = this.store.hasta();
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  applyRange(): void {
    if (!this.desde || !this.hasta) {
      return;
    }

    if (this.desde > this.hasta) {
      const from = this.desde;
      this.desde = this.hasta;
      this.hasta = from;
    }

    void this.store.load(this.desde, this.hasta);
  }

  refresh(): void {
    void this.store.load(this.desde, this.hasta);
  }

  money(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  percent(value: string | number, max: number): number {
    if (max <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((Number(value) / max) * 100)));
  }

  barHeight(value: string | number, max: number): number {
    return Math.max(6, this.percent(value, max));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CU', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  canalLabel(canal: string): string {
    return CANAL_PEDIDO_LABELS[canal as CanalPedido] ?? canal;
  }

  metodoLabel(metodo: string): string {
    return METODO_PAGO_LABELS[metodo as MetodoPago] ?? metodo;
  }

  estadoLabel(estado: string): string {
    return ESTADO_CUMPLIMIENTO_LABELS[estado as EstadoCumplimiento] ?? estado;
  }

  paymentLabel(estado: string): string {
    return this.paymentLabels[estado] ?? estado;
  }

  statusClass(estado: string): string {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ';
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
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ';
    const variants: Record<string, string> = {
      pendiente: 'bg-mustard-100 text-mustard-800',
      parcial: 'bg-brand-50 text-brand-700',
      pagado: 'bg-lettuce/10 text-lettuce',
      reembolsado: 'bg-stone-100 text-stone-600',
    };

    return base + (variants[estado] ?? 'bg-stone-100 text-stone-600');
  }
}
