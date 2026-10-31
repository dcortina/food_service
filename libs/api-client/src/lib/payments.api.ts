import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from './api.types';

export type PaymentMethod = 'efectivo' | 'transfermovil' | 'enzona';

export interface Payment {
  id: string;
  pedido: {
    id: string;
    codigoPublico: string;
    total: string;
    estadoPago: string;
    estadoCumplimiento: string;
  };
  metodo: PaymentMethod;
  estado: 'registrado' | 'verificado' | 'conciliado' | 'anulado';
  monto: string;
  montoRecibido: string | null;
  cambio: string | null;
  referenciaExterna: string | null;
  creadoEn: string;
}

export interface CreatePaymentPayload {
  pedidoId: string;
  metodo: PaymentMethod;
  monto: string;
  montoRecibido?: string;
  referenciaExterna?: string;
  idempotencyKey?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsApi {
  constructor(private readonly http: HttpClient) {}

  register(payload: CreatePaymentPayload): Observable<Payment> {
    return this.http.post<Payment>('/api/v1/payments', payload);
  }

  list(params: {
    page?: number;
    pageSize?: number;
    estado?: string;
    metodo?: string;
  } = {}): Observable<Paginated<Payment>> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 50));

    if (params.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }

    if (params.metodo) {
      httpParams = httpParams.set('metodo', params.metodo);
    }

    return this.http.get<Paginated<Payment>>('/api/v1/payments', {
      params: httpParams,
    });
  }

  verify(id: string): Observable<Payment> {
    return this.http.post<Payment>(`/api/v1/payments/${id}/verify`, {});
  }

  reconcile(id: string): Observable<Payment> {
    return this.http.post<Payment>(`/api/v1/payments/${id}/reconcile`, {});
  }

  void(id: string, motivo: string): Observable<Payment> {
    return this.http.post<Payment>(`/api/v1/payments/${id}/void`, {
      motivo,
    });
  }
}
