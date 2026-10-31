import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from './api.types';

export interface User {
  id: string;
  negocioId: string;
  nombre: string;
  username: string;
  telefono: string | null;
  activo: boolean;
  rol: { id: string; nombre: string };
  sucursal: { id: string; nombre: string } | null;
  ultimoAcceso: string | null;
  creadoEn: string;
}

export interface Role {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface Branch {
  id: string;
  nombre: string;
}

export interface CreateUserPayload {
  nombre: string;
  username: string;
  password: string;
  pin?: string;
  telefono?: string;
  rolId: string;
  sucursalId: string;
}

export type UpdateUserPayload = Partial<CreateUserPayload> & {
  activo?: boolean;
};

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  constructor(private readonly http: HttpClient) {}

  list(params: ListUsersParams = {}): Observable<Paginated<User>> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 100));

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.activo !== undefined) {
      httpParams = httpParams.set('activo', String(params.activo));
    }

    return this.http.get<Paginated<User>>('/api/v1/users', {
      params: httpParams,
    });
  }

  listRoles(): Observable<Role[]> {
    return this.http.get<Role[]>('/api/v1/users/roles');
  }

  listBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>('/api/v1/users/branches');
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>('/api/v1/users', payload);
  }

  update(id: string, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`/api/v1/users/${id}`, payload);
  }
}
