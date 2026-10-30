import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardResponse } from './api.types';

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  constructor(private readonly http: HttpClient) {}

  getDashboard(
    desde?: string,
    hasta?: string,
  ): Observable<DashboardResponse> {
    let params = new HttpParams();

    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);

    return this.http.get<DashboardResponse>(
      '/api/v1/reports/dashboard',
      { params },
    );
  }
}
