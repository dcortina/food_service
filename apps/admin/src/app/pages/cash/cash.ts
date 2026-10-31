import { NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '@cafeqr/auth';
import { CashApi, CashShift, ReportsApi, CashCloseReport } from '@cafeqr/api-client';
import { PERMISSIONS } from '@cafeqr/shared';

type ShiftFilter = 'all' | 'abierto' | 'cerrado';

@Component({
  selector: 'app-admin-cash-page',
  imports: [NgClass],
  templateUrl: './cash.html',
})
export class AdminCashPage implements OnInit {
  private readonly cashApi = inject(CashApi);
  private readonly reportsApi = inject(ReportsApi);
  private readonly auth = inject(AuthService);

  readonly canExport = this.auth.hasPermission(PERMISSIONS.REPORTE_EXPORTAR);

  readonly shifts = signal<CashShift[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<ShiftFilter>('all');

  readonly selected = signal<CashCloseReport | null>(null);
  readonly loadingDetail = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly exporting = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.cashApi
      .list({
        pageSize: 50,
        ...(this.filter() === 'all' ? {} : { estado: this.filter() }),
      })
      .subscribe({
        next: (response) => {
          this.shifts.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los turnos de caja.');
          this.loading.set(false);
        },
      });
  }

  setFilter(filter: ShiftFilter): void {
    this.filter.set(filter);
    this.load();
  }

  openDetail(shift: CashShift): void {
    this.loadingDetail.set(true);
    this.detailError.set(null);
    this.selected.set(null);

    this.reportsApi.getCashClose(shift.id).subscribe({
      next: (report) => {
        this.selected.set(report);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.detailError.set('No se pudo cargar el cierre del turno.');
        this.loadingDetail.set(false);
      },
    });
  }

  closeDetail(): void {
    this.selected.set(null);
    this.detailError.set(null);
  }

  exportDetail(): void {
    const report = this.selected();

    if (!report || !this.canExport || this.exporting()) {
      return;
    }

    this.exporting.set(true);
    this.reportsApi.downloadCashCloseCsv(report.turno.id).subscribe({
      next: (download) => {
        this.downloadFile(download.blob, download.filename);
        this.exporting.set(false);
      },
      error: () => {
        this.detailError.set('No se pudo exportar el CSV del cierre.');
        this.exporting.set(false);
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

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
