import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@cafeqr/auth';
import {
  Courier,
  DeliveryApi,
  PendingLiquidation,
} from '@cafeqr/api-client';
import { PERMISSIONS } from '@cafeqr/shared';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-couriers-page',
  imports: [NgClass, FormsModule],
  templateUrl: './couriers.html',
})
export class CouriersPage implements OnInit {
  private readonly deliveryApi = inject(DeliveryApi);
  private readonly auth = inject(AuthService);

  readonly canLiquidate = computed(() =>
    this.auth.hasPermission(PERMISSIONS.REPARTIDOR_LIQUIDAR),
  );

  readonly couriers = signal<Courier[]>([]);
  readonly pending = signal<PendingLiquidation[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly selected = signal<PendingLiquidation | null>(null);
  readonly totalEntregado = signal('0.00');
  readonly observaciones = signal('');
  readonly saving = signal(false);
  readonly closeError = signal<string | null>(null);

  readonly totalPending = computed(() =>
    this.pending().reduce(
      (sum, item) => sum + Number(item.totalCobrado),
      0,
    ),
  );

  readonly totalOrders = computed(() =>
    this.pending().reduce((sum, item) => sum + item.totalPedidos, 0),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      couriers: this.deliveryApi.listCouriers(),
      pending: this.deliveryApi.listPendingLiquidations(),
    }).subscribe({
      next: ({ couriers, pending }) => {
        this.couriers.set(couriers);
        this.pending.set(pending);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los repartidores.');
        this.loading.set(false);
      },
    });
  }

  pendingFor(courierId: string): PendingLiquidation | null {
    return (
      this.pending().find((item) => item.repartidor.id === courierId) ?? null
    );
  }

  openLiquidation(pending: PendingLiquidation): void {
    this.selected.set(pending);
    this.totalEntregado.set(pending.totalCobrado);
    this.observaciones.set('');
    this.closeError.set(null);
    this.success.set(null);
  }

  closeLiquidation(): void {
    const pending = this.selected();

    if (!pending || this.saving()) {
      return;
    }

    const amount = Number(this.totalEntregado());

    if (!Number.isFinite(amount) || amount < 0) {
      this.closeError.set('Ingrese un monto entregado válido.');
      return;
    }

    this.saving.set(true);
    this.closeError.set(null);

    this.deliveryApi
      .createLiquidation({
        repartidorId: pending.repartidor.id,
        totalEntregado: amount.toFixed(2),
        ...(this.observaciones().trim()
          ? { observaciones: this.observaciones().trim() }
          : {}),
      })
      .subscribe({
        next: (liquidation) => {
          this.saving.set(false);
          this.selected.set(null);
          this.success.set(
            `Liquidación cerrada para ${pending.repartidor.nombre}: $ ${this.money(
              liquidation.totalCobrado,
            )} cobrado, $ ${this.money(
              liquidation.totalEntregado,
            )} entregado, diferencia $ ${this.money(
              liquidation.diferencia,
            )}.`,
          );
          this.load();
        },
        error: (error) => {
          this.closeError.set(
            this.message(error, 'No se pudo cerrar la liquidación.'),
          );
          this.saving.set(false);
        },
      });
  }

  closeModal(): void {
    if (!this.saving()) {
      this.selected.set(null);
      this.closeError.set(null);
    }
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

  private message(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: string | string[] } })
      ?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return typeof message === 'string' && message ? message : fallback;
  }
}
