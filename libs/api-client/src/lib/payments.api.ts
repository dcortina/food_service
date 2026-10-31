import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

  verify(id: string): Observable<Payment> {
    return this.http.post<Payment>(`/api/v1/payments/${id}/verify`, {});
  }
}
