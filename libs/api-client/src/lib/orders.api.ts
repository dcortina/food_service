import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { CanalPedido, TipoServicio } from '@cafeqr/shared';
import { Observable } from 'rxjs';
import { Paginated } from './api.types';

export interface OrderModifierPayload {
  modificadorId: string;
}

export interface OrderItemPayload {
  productoId: string;
  cantidad: number;
  modificadores?: OrderModifierPayload[];
  notas?: string;
}

export interface OrderCustomerPayload {
  nombre?: string;
  telefono?: string;
  direccion?: string;
}

export interface CreateOrderPayload {
  canal: CanalPedido;
  tipoServicio: TipoServicio;
  mesaId?: string;
  cliente?: OrderCustomerPayload;
  items: OrderItemPayload[];
  notas?: string;
  descuento?: string;
  idempotencyKey?: string;
}

export interface OrderItem {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  notas: string | null;
  estadoItem: string;
  modificadores: Array<{
    id: string;
    modificadorId: string;
    nombre: string;
    tipo: string;
    precioExtra: string;
  }>;
}

export interface Order {
  id: string;
  codigoPublico: string;
  canal: CanalPedido;
  tipoServicio: TipoServicio;
  mesa: {
    id: string;
    numero: string;
    zona?: { id: string; nombre: string };
  } | null;
  clienteNombre: string | null;
  clienteTelefono: string | null;
  direccionEntrega: string | null;
  estadoCumplimiento: string;
  estadoPago: string;
  subtotal: string;
  descuento: string;
  impuesto: string;
  total: string;
  notas: string | null;
  creadoEn: string;
  items: OrderItem[];
}

export interface ListOrdersParams {
  page?: number;
  pageSize?: number;
  estado?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  constructor(private readonly http: HttpClient) {}

  list(params: ListOrdersParams = {}): Observable<Paginated<Order>> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 50));

    if (params.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<Paginated<Order>>('/api/v1/orders', {
      params: httpParams,
    });
  }

  create(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>('/api/v1/orders', payload);
  }

  confirm(id: string): Observable<Order> {
    return this.http.post<Order>(`/api/v1/orders/${id}/confirm`, {});
  }
}
