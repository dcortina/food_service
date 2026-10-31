import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PublicOrderModifierPayload {
  modificadorId: string;
}

export interface PublicOrderItemPayload {
  productoId: string;
  cantidad: number;
  modificadores?: PublicOrderModifierPayload[];
  notas?: string;
}

export interface PublicCreateOrderPayload {
  codigoQr: string;
  items: PublicOrderItemPayload[];
  cliente?: {
    nombre?: string;
    telefono?: string;
    direccion?: string;
  };
  notas?: string;
  idempotencyKey: string;
}

export interface PublicOrderItem {
  id: string;
  productoNombre: string;
  cantidad: number;
  subtotal: string;
  notas: string | null;
  estadoItem: string;
  modificadores: Array<{
    nombre: string;
    precioExtra: string;
  }>;
}

export interface PublicOrder {
  id: string;
  codigoPublico: string;
  estadoCumplimiento: string;
  estadoPago: string;
  subtotal: string;
  descuento: string;
  impuesto: string;
  total: string;
  moneda: { codigo: string; simbolo: string };
  etaMinutos: number;
  creadoEn: string;
  mesa: { id: string; numero: string } | null;
  items: PublicOrderItem[];
}

@Injectable({ providedIn: 'root' })
export class PublicOrdersApi {
  constructor(private readonly http: HttpClient) {}

  create(payload: PublicCreateOrderPayload): Observable<PublicOrder> {
    return this.http.post<PublicOrder>('/api/v1/public/orders', payload);
  }

  status(id: string, codigoQr: string): Observable<PublicOrder> {
    const params = new HttpParams().set('codigoQr', codigoQr);

    return this.http.get<PublicOrder>(`/api/v1/public/orders/${id}`, {
      params,
    });
  }
}
