import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Order } from './orders.api';

export type KdsItemStatus = 'en_preparacion' | 'listo';

export interface KdsOrder extends Order {
  elapsedMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class KdsApi {
  constructor(private readonly http: HttpClient) {}

  listOrders(): Observable<KdsOrder[]> {
    return this.http.get<KdsOrder[]>('/api/v1/kds/orders');
  }

  updateItemStatus(
    orderId: string,
    itemId: string,
    estado: KdsItemStatus,
  ): Observable<Order> {
    return this.http.patch<Order>(
      `/api/v1/kds/orders/${orderId}/items/${itemId}/status`,
      { estado },
    );
  }

  markOrderReady(orderId: string): Observable<Order> {
    return this.http.post<Order>(
      `/api/v1/kds/orders/${orderId}/ready`,
      {},
    );
  }
}
