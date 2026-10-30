import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

  desde = this.store.desde();
  hasta = this.store.hasta();

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
      nuevo: 'bg-slate-100 text-slate-600',
      confirmado: 'bg-sky-50 text-sky-700',
      en_preparacion: 'bg-amber-50 text-amber-700',
      listo: 'bg-emerald-50 text-emerald-700',
      entregado: 'bg-slate-100 text-slate-500',
      cancelado: 'bg-rose-50 text-rose-700',
    };

    return base + (variants[estado] ?? 'bg-slate-100 text-slate-600');
  }

  paymentClass(estado: string): string {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ';
    const variants: Record<string, string> = {
      pendiente: 'bg-amber-50 text-amber-700',
      parcial: 'bg-sky-50 text-sky-700',
      pagado: 'bg-emerald-50 text-emerald-700',
      reembolsado: 'bg-rose-50 text-rose-700',
    };

    return base + (variants[estado] ?? 'bg-slate-100 text-slate-600');
  }
}
