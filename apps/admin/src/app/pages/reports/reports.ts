import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@cafeqr/auth';
import {
  CashCloseReport,
  DashboardResponse,
  ReportsApi,
  SalesByCashier,
  SalesByChannel,
  SalesByCourier,
  SalesByProduct,
} from '@cafeqr/api-client';
import {
  CANAL_PEDIDO_LABELS,
  METODO_PAGO_LABELS,
  PERMISSIONS,
  CanalPedido,
  MetodoPago,
} from '@cafeqr/shared';
import { forkJoin } from 'rxjs';

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reports-page',
  imports: [FormsModule],
  templateUrl: './reports.html',
})
export class ReportsPage implements OnInit {
  private readonly reportsApi = inject(ReportsApi);
  private readonly auth = inject(AuthService);

  readonly canExport = computed(() =>
    this.auth.hasPermission(PERMISSIONS.REPORTE_EXPORTAR),
  );

  readonly desde = signal(today());
  readonly hasta = signal(today());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly dashboard = signal<DashboardResponse | null>(null);
  readonly channels = signal<SalesByChannel>([]);
  readonly products = signal<SalesByProduct>([]);
  readonly cashiers = signal<SalesByCashier>([]);
  readonly couriers = signal<SalesByCourier>([]);
  readonly cashClose = signal<CashCloseReport | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      dashboard: this.reportsApi.getDashboard(
        this.desde(),
        this.hasta(),
      ),
      channels: this.reportsApi.getSalesByChannel(
        this.desde(),
        this.hasta(),
      ),
      products: this.reportsApi.getSalesByProduct(
        this.desde(),
        this.hasta(),
        20,
      ),
      cashiers: this.reportsApi.getSalesByCashier(
        this.desde(),
        this.hasta(),
      ),
      couriers: this.reportsApi.getSalesByCourier(
        this.desde(),
        this.hasta(),
      ),
    }).subscribe({
      next: ({ dashboard, channels, products, cashiers, couriers }) => {
        this.dashboard.set(dashboard);
        this.channels.set(channels);
        this.products.set(products);
        this.cashiers.set(cashiers);
        this.couriers.set(couriers);
        this.loading.set(false);

        if (dashboard.cajaAbierta) {
          this.loadCashClose(dashboard.cajaAbierta.id);
        } else {
          this.cashClose.set(null);
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar los reportes.');
        this.loading.set(false);
      },
    });
  }

  applyRange(): void {
    if (!this.desde() || !this.hasta()) {
      return;
    }

    if (this.desde() > this.hasta()) {
      const from = this.desde();
      this.desde.set(this.hasta());
      this.hasta.set(from);
    }

    this.load();
  }

  exportSales(): void {
    if (!this.canExport() || this.exporting()) {
      return;
    }

    this.exporting.set(true);
    this.reportsApi
      .downloadSalesCsv(this.desde(), this.hasta())
      .subscribe({
        next: (report) => {
          this.download(report.blob, report.filename);
          this.exporting.set(false);
        },
        error: () => {
          this.error.set('No se pudo exportar el CSV de ventas.');
          this.exporting.set(false);
        },
      });
  }

  exportCashClose(): void {
    const report = this.cashClose();

    if (!this.canExport() || !report || this.exporting()) {
      return;
    }

    this.exporting.set(true);
    this.reportsApi.downloadCashCloseCsv(report.turno.id).subscribe({
      next: (download) => {
        this.download(download.blob, download.filename);
        this.exporting.set(false);
      },
      error: () => {
        this.error.set('No se pudo exportar el CSV de cierre de caja.');
        this.exporting.set(false);
      },
    });
  }

  canalLabel(canal: string): string {
    return CANAL_PEDIDO_LABELS[canal as CanalPedido] ?? canal;
  }

  metodoLabel(metodo: string): string {
    return METODO_PAGO_LABELS[metodo as MetodoPago] ?? metodo;
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

  private loadCashClose(turnoId: string): void {
    this.reportsApi.getCashClose(turnoId).subscribe({
      next: (report) => this.cashClose.set(report),
      error: () => this.cashClose.set(null),
    });
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
