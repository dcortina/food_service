import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { of, switchMap } from 'rxjs';
import {
  CashApi,
  CashShift,
  Order,
  Payment,
  PaymentMethod,
  PaymentsApi,
} from '@cafeqr/api-client';

@Component({
  selector: 'app-payment-dialog',
  imports: [NgClass, FormsModule],
  templateUrl: './payment-dialog.html',
})
export class PaymentDialog implements OnInit {
  private readonly cashApi = inject(CashApi);
  private readonly paymentsApi = inject(PaymentsApi);

  readonly order = input.required<Order>();
  readonly paid = output<Payment>();
  readonly closed = output<void>();

  readonly shift = signal<CashShift | null>(null);
  readonly loadingShift = signal(true);
  readonly shiftError = signal<string | null>(null);
  readonly openingShift = signal(false);
  readonly floatAmount = signal('0.00');

  readonly method = signal<PaymentMethod>('efectivo');
  readonly amount = signal('');
  readonly received = signal('');
  readonly reference = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<Payment | null>(null);

  private paymentKey = crypto.randomUUID();

  readonly total = computed(() => Number(this.order().total));
  readonly paidAmount = computed(() =>
    this.order()
      .pagos.filter((payment) => payment.estado !== 'anulado')
      .reduce((sum, payment) => sum + Number(payment.monto), 0),
  );
  readonly remaining = computed(() =>
    Math.max(0, this.total() - this.paidAmount()),
  );
  readonly change = computed(() =>
    Math.max(0, Number(this.received() || 0) - Number(this.amount() || 0)),
  );
  readonly paymentAmount = computed(() => Number(this.amount() || 0));
  readonly canPay = computed(() => {
    if (!this.shift() || this.saving() || this.success()) {
      return false;
    }

    if (
      this.paymentAmount() <= 0 ||
      this.paymentAmount() > this.remaining() + 0.001
    ) {
      return false;
    }

    if (this.method() === 'efectivo') {
      return Number(this.received() || 0) >= this.paymentAmount();
    }

    return this.reference().trim().length >= 3;
  });

  ngOnInit(): void {
    this.amount.set(this.remaining().toFixed(2));
    this.received.set(this.remaining().toFixed(2));
    this.loadShift();
  }

  loadShift(): void {
    this.loadingShift.set(true);
    this.shiftError.set(null);

    this.cashApi.getCurrent().subscribe({
      next: (shift) => {
        this.shift.set(shift);
        this.loadingShift.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.shift.set(null);
        this.loadingShift.set(false);

        if (error.status !== 404) {
          this.shiftError.set('No se pudo consultar el estado de la caja.');
        }
      },
    });
  }

  openShift(): void {
    const amount = Number(this.floatAmount());

    if (!Number.isFinite(amount) || amount <= 0) {
      this.shiftError.set('Ingrese un fondo inicial mayor que cero.');
      return;
    }

    this.openingShift.set(true);
    this.shiftError.set(null);

    this.cashApi.open({ fondoInicial: amount.toFixed(2) }).subscribe({
      next: (shift) => {
        this.shift.set(shift);
        this.openingShift.set(false);
      },
      error: (error) => {
        this.shiftError.set(
          this.message(error, 'No se pudo abrir la caja.'),
        );
        this.openingShift.set(false);
      },
    });
  }

  setMethod(method: PaymentMethod): void {
    this.method.set(method);
    this.error.set(null);
    this.success.set(null);
    this.paymentKey = crypto.randomUUID();

    if (method === 'efectivo') {
      this.received.set(this.amount());
    }
  }

  setAmount(value: string | number): void {
    const amount = Number(value);
    this.amount.set(Number.isFinite(amount) ? amount.toFixed(2) : '0.00');

    if (this.method() === 'efectivo') {
      this.received.set(this.amount());
    }
  }

  pay(): void {
    if (!this.canPay()) {
      return;
    }

    const order = this.order();
    this.saving.set(true);
    this.error.set(null);

    this.paymentsApi
      .register({
        pedidoId: order.id,
        metodo: this.method(),
        monto: this.paymentAmount().toFixed(2),
        ...(this.method() === 'efectivo'
          ? { montoRecibido: Number(this.received()).toFixed(2) }
          : { referenciaExterna: this.reference().trim() }),
        idempotencyKey: this.paymentKey,
      })
      .pipe(
        switchMap((payment) =>
          this.method() === 'efectivo'
            ? of(payment)
            : this.paymentsApi.verify(payment.id),
        ),
      )
      .subscribe({
        next: (payment) => {
          this.success.set(payment);
          this.saving.set(false);
          this.paid.emit(payment);
        },
        error: (error) => {
          this.error.set(
            this.message(error, 'No se pudo registrar el pago.'),
          );
          this.saving.set(false);
        },
      });
  }

  close(): void {
    if (!this.saving()) {
      this.closed.emit();
    }
  }

  money(value: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
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
