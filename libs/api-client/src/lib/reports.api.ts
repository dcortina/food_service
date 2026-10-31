import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { DashboardResponse } from './api.types';
import { CashShift } from './cash.api';

export type SalesByChannel = DashboardResponse['ventasPorCanal'];
export type SalesByProduct = DashboardResponse['productosTop'];
export type SalesByCashier = DashboardResponse['ventasPorCajero'];
export type SalesByCourier = DashboardResponse['ventasPorRepartidor'];

export interface CashCloseReport {
  turno: CashShift;
  resumen: {
    fondoInicial: string;
    efectivoEsperado: string | null;
    efectivoContado: string | null;
    descuadre: string | null;
    totalElectronicoReportado: string;
    totalElectronicoConciliado: string;
    pagosEfectivo: string;
    pagosElectronicos: string;
    totalPagos: string;
    movimientos: string;
  };
}

export interface DownloadedReport {
  blob: Blob;
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  constructor(private readonly http: HttpClient) {}

  getDashboard(
    desde?: string,
    hasta?: string,
  ): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(
      '/api/v1/reports/dashboard',
      { params: this.rangeParams(desde, hasta) },
    );
  }

  getSalesByChannel(
    desde?: string,
    hasta?: string,
  ): Observable<SalesByChannel> {
    return this.http.get<SalesByChannel>(
      '/api/v1/reports/sales/by-channel',
      { params: this.rangeParams(desde, hasta) },
    );
  }

  getSalesByProduct(
    desde?: string,
    hasta?: string,
    limit = 10,
  ): Observable<SalesByProduct> {
    const params = this.rangeParams(desde, hasta).set(
      'limit',
      String(limit),
    );

    return this.http.get<SalesByProduct>(
      '/api/v1/reports/sales/by-product',
      { params },
    );
  }

  getSalesByCashier(
    desde?: string,
    hasta?: string,
  ): Observable<SalesByCashier> {
    return this.http.get<SalesByCashier>(
      '/api/v1/reports/sales/by-cashier',
      { params: this.rangeParams(desde, hasta) },
    );
  }

  getSalesByCourier(
    desde?: string,
    hasta?: string,
  ): Observable<SalesByCourier> {
    return this.http.get<SalesByCourier>(
      '/api/v1/reports/sales/by-courier',
      { params: this.rangeParams(desde, hasta) },
    );
  }

  getCashClose(turnoId: string): Observable<CashCloseReport> {
    return this.http.get<CashCloseReport>(
      `/api/v1/reports/cash-close/${turnoId}`,
    );
  }

  downloadSalesCsv(
    desde?: string,
    hasta?: string,
  ): Observable<DownloadedReport> {
    return this.http
      .get('/api/v1/reports/export/sales.csv', {
        params: this.rangeParams(desde, hasta),
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(map((response) => this.download(response, 'ventas.csv')));
  }

  downloadCashCloseCsv(turnoId: string): Observable<DownloadedReport> {
    return this.http
      .get(`/api/v1/reports/export/cash-close/${turnoId}.csv`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(map((response) => this.download(response, `cierre-${turnoId}.csv`)));
  }

  private rangeParams(desde?: string, hasta?: string): HttpParams {
    let params = new HttpParams();

    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);

    return params;
  }

  private download(
    response: HttpResponse<Blob>,
    fallback: string,
  ): DownloadedReport {
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="([^"]+)"/i.exec(disposition);

    return {
      blob: response.body ?? new Blob(),
      filename: match?.[1] ?? fallback,
    };
  }
}
