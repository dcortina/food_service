import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
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
  mesas?: RestaurantTable[];
}

export interface CreateZonePayload {
  nombre: string;
  activo?: boolean;
}

export type UpdateZonePayload = Partial<CreateZonePayload>;

export interface CreateTablePayload {
  zonaId: string;
  numero: string;
  capacidad?: number;
  estado?: 'libre' | 'ocupada' | 'reservada' | 'inactiva';
  activo?: boolean;
}

export type UpdateTablePayload = Partial<CreateTablePayload>;

export interface TableQr {
  id: string;
  numero: string;
  codigoQr: string;
  url: string;
}

export interface DownloadedQr {
  blob: Blob;
  filename: string;
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

  createZone(payload: CreateZonePayload): Observable<Zone> {
    return this.http.post<Zone>('/api/v1/tables/zones', payload);
  }

  updateZone(id: string, payload: UpdateZonePayload): Observable<Zone> {
    return this.http.patch<Zone>(`/api/v1/tables/zones/${id}`, payload);
  }

  createTable(payload: CreateTablePayload): Observable<RestaurantTable> {
    return this.http.post<RestaurantTable>('/api/v1/tables', payload);
  }

  updateTable(
    id: string,
    payload: UpdateTablePayload,
  ): Observable<RestaurantTable> {
    return this.http.patch<RestaurantTable>(
      `/api/v1/tables/${id}`,
      payload,
    );
  }

  regenerateQr(id: string): Observable<RestaurantTable> {
    return this.http.post<RestaurantTable>(
      `/api/v1/tables/${id}/regenerate-qr`,
      {},
    );
  }

  getQr(id: string): Observable<TableQr> {
    return this.http.get<TableQr>(`/api/v1/tables/${id}/qr`);
  }

  getQrPng(id: string): Observable<DownloadedQr> {
    return this.http
      .get(`/api/v1/tables/${id}/qr.png`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(map((response) => this.download(response, `mesa-${id}.png`)));
  }

  private download(
    response: HttpResponse<Blob>,
    fallback: string,
  ): DownloadedQr {
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="([^"]+)"/i.exec(disposition);

    return {
      blob: response.body ?? new Blob(),
      filename: match?.[1] ?? fallback,
    };
  }
}
