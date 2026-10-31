import { NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  DeliveryApi,
  DeliveryCurrentLiquidation,
  DeliveryLiquidation,
} from '@cafeqr/api-client';

@Component({
  selector: 'app-delivery-liquidation',
  imports: [NgClass],
  templateUrl: './delivery-liquidation.html',
})
export class DeliveryLiquidationPage implements OnInit {
  private readonly deliveryApi = inject(DeliveryApi);

  readonly current = signal<DeliveryCurrentLiquidation | null>(null);
  readonly history = signal<DeliveryLiquidation[]>([]);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.current() === null) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    this.error.set(null);

    forkJoin({
      current: this.deliveryApi.currentLiquidation(),
      history: this.deliveryApi.listLiquidations(),
    }).subscribe({
      next: ({ current, history }) => {
        this.current.set(current);
        this.history.set(history);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la liquidación.');
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  money(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-CU', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      liquidada: 'Liquidada',
      con_diferencia: 'Con diferencia',
    };

    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    const base = 'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ';

    if (status === 'liquidada') {
      return base + 'bg-lettuce/10 text-lettuce';
    }

    if (status === 'con_diferencia') {
      return base + 'bg-brand-50 text-brand-700';
    }

    return base + 'bg-mustard-100 text-mustard-800';
  }
}
