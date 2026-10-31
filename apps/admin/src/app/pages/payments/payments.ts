import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '@cafeqr/auth';
import { Payment, PaymentsApi } from '@cafeqr/api-client';
import {
  METODO_PAGO_LABELS,
  PERMISSIONS,
  MetodoPago,
} from '@cafeqr/shared';
import { Observable } from 'rxjs';

type PaymentFilter =
  | 'all'
  | 'registrado'
  | 'verificado'
  | 'conciliado'
  | 'anulado';

type MethodFilter = 'all' | 'efectivo' | 'transfermovil' | 'enzona';

@Component({
  selector: 'app-admin-payments-page',
  imports: [NgClass],
  templateUrl: './payments.html',
})
export class AdminPaymentsPage implements OnInit {
  private readonly paymentsApi = inject(PaymentsApi);
  private readonly auth = inject(AuthService);

  readonly canVerify = computed(() =>
    this.auth.hasPermission(PERMISSIONS.PAGO_REGISTRAR),
  );
  readonly canReconcile = computed(() =>
    this.auth.hasPermission(PERMISSIONS.PAGO_CONCILIAR),
  );
  readonly canVoid = computed(() =>
    this.auth.hasPermission(PERMISSIONS.PAGO_ANULAR),
  );

  readonly payments = signal<Payment[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly stateFilter = signal<PaymentFilter>('all');
  readonly methodFilter = signal<MethodFilter>('all');
  readonly busy = signal<Set<string>>(new Set());

  readonly states: Array<{ value: PaymentFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'registrado', label: 'Registrados' },
    { value: 'verificado', label: 'Verificados' },
    { value: 'conciliado', label: 'Conciliados' },
    { value: 'anulado', label: 'Anulados' },
  ];

  readonly methods: Array<{ value: MethodFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transfermovil', label: 'Transfermóvil' },
    { value: 'enzona', label: 'EnZona' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.paymentsApi
      .list({
        pageSize: 50,
        ...(this.stateFilter() === 'all'
          ? {}
          : { estado: this.stateFilter() }),
        ...(this.methodFilter() === 'all'
          ? {}
          : { metodo: this.methodFilter() }),
      })
      .subscribe({
        next: (response) => {
          this.payments.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los pagos.');
          this.loading.set(false);
        },
      });
  }

  setStateFilter(filter: PaymentFilter): void {
    this.stateFilter.set(filter);
    this.load();
  }

  setMethodFilter(filter: MethodFilter): void {
    this.methodFilter.set(filter);
    this.load();
  }

  verify(payment: Payment): void {
    if (!this.canVerify() || this.busy().has(payment.id)) {
      return;
    }

    this.runAction(payment.id, this.paymentsApi.verify(payment.id), 'verificado');
  }

  reconcile(payment: Payment): void {
    if (!this.canReconcile() || this.busy().has(payment.id)) {
      return;
    }

    this.runAction(
      payment.id,
      this.paymentsApi.reconcile(payment.id),
      'conciliado',
    );
  }

  void(payment: Payment): void {
    if (!this.canVoid() || this.busy().has(payment.id)) {
      return;
    }

    const motivo = window.prompt(
      'Motivo de la anulación del pago:',
      '',
    )?.trim();

    if (!motivo) {
      return;
    }

    this.runAction(
      payment.id,
      this.paymentsApi.void(payment.id, motivo),
      'anulado',
    );
  }

  metodoLabel(metodo: string): string {
    return METODO_PAGO_LABELS[metodo as MetodoPago] ?? metodo;
  }

  estadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      registrado: 'Registrado',
      verificado: 'Verificado',
      conciliado: 'Conciliado',
      anulado: 'Anulado',
    };

    return labels[estado] ?? estado;
  }

  stateClass(estado: string): string {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-bold ';

    if (estado === 'verificado') {
      return base + 'bg-mustard-100 text-mustard-800';
    }

    if (estado === 'conciliado') {
      return base + 'bg-lettuce/10 text-lettuce';
    }

    if (estado === 'anulado') {
      return base + 'bg-brand-50 text-brand-700';
    }

    return base + 'bg-stone-100 text-stone-600';
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

  private runAction(
    id: string,
    request: Observable<Payment>,
    label: string,
  ): void {
    this.busy.update((current) => new Set(current).add(id));
    this.success.set(null);

    request.subscribe({
      next: (payment) => {
        this.busy.update((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        this.success.set(
          `Pago ${payment.pedido.codigoPublico} ${label}.`,
        );
        this.load();
      },
      error: () => {
        this.busy.update((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        this.error.set('No se pudo actualizar el pago.');
      },
    });
  }
}
