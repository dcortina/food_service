import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DeliveryOrderItem {
  id: string;
  productoNombre: string;
  cantidad: number;
  subtotal: string;
  notas: string | null;
  modificadores: Array<{
    nombre: string;
    precioExtra: string;
  }>;
}

export interface DeliveryOrder {
  assignmentId: string;
  orderId: string;
  codigoPublico: string;
  estadoCumplimiento: string;
  estadoPago: string;
  total: string;
  moneda: { codigo: string; simbolo: string };
  cliente: {
    nombre: string | null;
    telefono: string | null;
    direccion: string | null;
  };
  notas: string | null;
  items: DeliveryOrderItem[];
  asignadoEn: string;
  salidaEn: string | null;
  entregadoEn: string | null;
  efectivoCobrado: string | null;
}

export interface DeliveryLiquidation {
  id: string;
  fechaOperativa: string;
  totalCobrado: string;
  totalEntregado: string;
  diferencia: string;
  estado: string;
  observaciones: string | null;
  creadoEn: string;
  cerradaEn: string | null;
  totalPedidos: number;
}

export interface DeliveryCurrentLiquidation {
  repartidor: {
    id: string;
    nombre: string;
    username: string;
    vehiculo: string | null;
  };
  totalCobrado: string;
  totalPedidos: number;
  orders: DeliveryOrder[];
}

@Injectable({ providedIn: 'root' })
export class DeliveryApi {
  constructor(private readonly http: HttpClient) {}

  listOrders(): Observable<DeliveryOrder[]> {
    return this.http.get<DeliveryOrder[]>('/api/v1/delivery/orders');
  }

  start(orderId: string): Observable<DeliveryOrder> {
    return this.http.post<DeliveryOrder>(
      `/api/v1/delivery/orders/${orderId}/start`,
      {},
    );
  }

  deliver(
    orderId: string,
    payload: { efectivoCobrado?: string },
  ): Observable<DeliveryOrder> {
    return this.http.post<DeliveryOrder>(
      `/api/v1/delivery/orders/${orderId}/deliver`,
      payload,
    );
  }

  currentLiquidation(): Observable<DeliveryCurrentLiquidation> {
    return this.http.get<DeliveryCurrentLiquidation>(
      '/api/v1/delivery/liquidations/current',
    );
  }

  listLiquidations(): Observable<DeliveryLiquidation[]> {
    return this.http.get<DeliveryLiquidation[]>(
      '/api/v1/delivery/liquidations',
    );
  }
}
