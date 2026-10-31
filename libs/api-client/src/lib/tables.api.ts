import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from './api.types';

export interface TableZone {
  id: string;
  nombre: string;
}

export interface RestaurantTable {
  id: string;
  zona: TableZone;
  numero: string;
  codigoQr: string;
  capacidad: number;
  estado: 'libre' | 'ocupada' | 'reservada' | 'inactiva';
  activo: boolean;
  url: string;
}

export interface Zone {
  id: string;
  nombre: string;
  activo: boolean;
  mesas: RestaurantTable[];
}

@Injectable({ providedIn: 'root' })
export class TablesApi {
  constructor(private readonly http: HttpClient) {}

  listZones(): Observable<Zone[]> {
    return this.http.get<Zone[]>('/api/v1/tables/zones');
  }

  listTables(
    params: {
      estado?: string;
      activo?: string;
      pageSize?: number;
    } = {},
  ): Observable<Paginated<RestaurantTable>> {
    let httpParams = new HttpParams().set(
      'pageSize',
      String(params.pageSize ?? 100),
    );

    if (params.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }

    if (params.activo) {
      httpParams = httpParams.set('activo', params.activo);
    }

    return this.http.get<Paginated<RestaurantTable>>('/api/v1/tables', {
      params: httpParams,
    });
  }
}
