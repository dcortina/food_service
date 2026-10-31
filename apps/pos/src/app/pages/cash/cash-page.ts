import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@cafeqr/auth';
import {
  CashApi,
  CashMovementType,
  CashShift,
  CreateMovementPayload,
} from '@cafeqr/api-client';
import { PERMISSIONS } from '@cafeqr/shared';

@Component({
  selector: 'app-cash-page',
  imports: [FormsModule],
  templateUrl: './cash-page.html',
})
export class CashPage implements OnInit {
  private readonly cashApi = inject(CashApi);
  private readonly auth = inject(AuthService);

  readonly canAuthorize = computed(() =>
    this.auth.hasPermission(PERMISSIONS.PIN_AUTORIZAR),
  );

  readonly shift = signal<CashShift | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly opening = signal(false);
  readonly openError = signal<string | null>(null);
  readonly floatAmount = signal('0.00');
  readonly closing = signal(false);
  readonly countedCash = signal('');
  readonly observations = signal('');
  readonly closeError = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly movementType = signal<CashMovementType>('ingreso');
  readonly movementAmount = signal('');
  readonly movementReason = signal('');
  readonly movementBusy = signal(false);
  readonly movementError = signal<string | null>(null);

  private readonly allMovementTypes: Array<{
    value: CashMovementType;
    label: string;
    restricted: boolean;
  }> = [
    { value: 'ingreso', label: 'Ingreso', restricted: false },
    { value: 'propina_efectivo', label: 'Propina', restricted: false },
    { value: 'ajuste', label: 'Ajuste', restricted: false },
    { value: 'retiro', label: 'Retiro', restricted: true },
    { value: 'gasto_menor', label: 'Gasto menor', restricted: true },
    {
      value: 'devolucion_efectivo',
      label: 'Devolución de efectivo',
      restricted: true,
    },
  ];

  readonly movementTypes = computed(() =>
    this.canAuthorize()
      ? this.allMovementTypes
      : this.allMovementTypes.filter((type) => !type.restricted),
  );

  ngOnInit(): void {
    this.loadCurrent();
  }

  loadCurrent(): void {
    this.loading.set(true);
    this.error.set(null);

    this.cashApi.getCurrent().subscribe({
      next: (shift) => {
        this.shift.set(shift);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.shift.set(null);
        this.loading.set(false);

        if (error.status !== 404) {
          this.error.set('No se pudo consultar el estado de la caja.');
        }
      },
    });
  }

  openShift(): void {
    const amount = Number(this.floatAmount());

    if (!Number.isFinite(amount) || amount <= 0) {
      this.openError.set('Ingrese un fondo inicial mayor que cero.');
      return;
    }

    this.opening.set(true);
    this.openError.set(null);

    this.cashApi.open({ fondoInicial: amount.toFixed(2) }).subscribe({
      next: (shift) => {
        this.shift.set(shift);
        this.opening.set(false);
        this.success.set('Caja abierta correctamente.');
      },
      error: (error) => {
        this.openError.set(
          this.message(error, 'No se pudo abrir la caja.'),
        );
        this.opening.set(false);
      },
    });
  }

  submitMovement(): void {
    const shift = this.shift();

    if (!shift || this.movementBusy()) {
      return;
    }

    const amount = Number(this.movementAmount());
    const reason = this.movementReason().trim();

    if (!Number.isFinite(amount) || amount === 0) {
      this.movementError.set('Ingrese un monto distinto de cero.');
      return;
    }

    if (this.movementType() !== 'ajuste' && amount < 0) {
      this.movementError.set('El monto debe ser mayor que cero.');
      return;
    }

    if (reason.length < 3) {
      this.movementError.set('Ingrese un motivo de al menos 3 caracteres.');
      return;
    }

    const restricted =
      this.movementType() === 'retiro' ||
      this.movementType() === 'gasto_menor' ||
      this.movementType() === 'devolucion_efectivo';

    if (restricted && !this.canAuthorize()) {
      this.movementError.set(
        'Este movimiento requiere un usuario autorizador.',
      );
      return;
    }

    const payload: CreateMovementPayload = {
      tipo: this.movementType(),
      monto: amount.toFixed(2),
      motivo: reason,
      ...(restricted
        ? { autorizadoPorId: this.auth.user()?.id }
        : {}),
    };

    this.movementBusy.set(true);
    this.movementError.set(null);
    this.success.set(null);

    this.cashApi.createMovement(shift.id, payload).subscribe({
      next: () => {
        this.movementBusy.set(false);
        this.movementAmount.set('');
        this.movementReason.set('');
        this.success.set('Movimiento de caja registrado.');
        this.loadCurrent();
      },
      error: (error) => {
        this.movementError.set(
          this.message(error, 'No se pudo registrar el movimiento.'),
        );
        this.movementBusy.set(false);
      },
    });
  }

  closeShift(): void {
    const shift = this.shift();

    if (!shift || this.closing()) {
      return;
    }

    const counted = Number(this.countedCash());

    if (!Number.isFinite(counted) || counted < 0) {
      this.closeError.set('Ingrese el efectivo contado.');
      return;
    }

    this.closing.set(true);
    this.closeError.set(null);
    this.success.set(null);

    this.cashApi
      .close(shift.id, {
        efectivoContado: counted.toFixed(2),
        ...(this.observations().trim()
          ? { observaciones: this.observations().trim() }
          : {}),
      })
      .subscribe({
        next: (closed) => {
          this.shift.set(closed);
          this.closing.set(false);
          this.success.set('Caja cerrada. Revise el descuadre del turno.');
        },
        error: (error) => {
          this.closeError.set(
            this.message(error, 'No se pudo cerrar la caja.'),
          );
          this.closing.set(false);
        },
      });
  }

  resetShift(): void {
    this.shift.set(null);
    this.countedCash.set('');
    this.observations.set('');
    this.success.set(null);
    this.closeError.set(null);
    this.openError.set(null);
    this.floatAmount.set('0.00');
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
