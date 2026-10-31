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

export interface Courier {
  id: string;
  nombre: string;
  username: string;
  vehiculo: string | null;
}

export interface PendingLiquidation {
  repartidor: Courier;
  totalCobrado: string;
  totalPedidos: number;
  orders: DeliveryOrder[];
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

  listCouriers(): Observable<Courier[]> {
    return this.http.get<Courier[]>('/api/v1/delivery/couriers');
  }

  assign(orderId: string, repartidorId: string): Observable<DeliveryOrder> {
    return this.http.post<DeliveryOrder>(
      `/api/v1/delivery/orders/${orderId}/assign`,
      { repartidorId },
    );
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

  listPendingLiquidations(): Observable<PendingLiquidation[]> {
    return this.http.get<PendingLiquidation[]>(
      '/api/v1/delivery/liquidations/pending',
    );
  }

  createLiquidation(payload: {
    repartidorId: string;
    totalEntregado: string;
    observaciones?: string;
  }): Observable<DeliveryLiquidation> {
    return this.http.post<DeliveryLiquidation>(
      '/api/v1/delivery/liquidations',
      payload,
    );
  }
}
