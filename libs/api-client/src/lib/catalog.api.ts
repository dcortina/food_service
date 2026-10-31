import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from './api.types';

export interface Category {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  productosCount: number;
}

export interface ProductPrice {
  monedaId: string;
  moneda: { codigo: string; simbolo: string };
  precio: string;
}

export interface Modifier {
  id: string;
  nombre: string;
  tipo: 'agregar' | 'quitar' | 'nota';
  precioExtra: string;
  orden: number;
  activo: boolean;
}

export interface ModifierGroup {
  id: string;
  nombre: string;
  tipo: 'unico' | 'multiple';
  minSeleccion: number;
  maxSeleccion: number;
  obligatorio: boolean;
  orden: number;
  modificadores: Modifier[];
}

export interface Product {
  id: string;
  categoriaId: string;
  categoria: { id: string; nombre: string };
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  disponible: boolean;
  tiempoPreparacionMin: number;
  precios: ProductPrice[];
  gruposModificadores: ModifierGroup[];
}

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  constructor(private readonly http: HttpClient) {}

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/v1/catalog/categories');
  }

  listProducts(
    params: {
      search?: string;
      categoriaId?: string;
      pageSize?: number;
    } = {},
  ): Observable<Paginated<Product>> {
    let httpParams = new HttpParams()
      .set('disponible', 'true')
      .set('pageSize', String(params.pageSize ?? 100));

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.categoriaId) {
      httpParams = httpParams.set('categoriaId', params.categoriaId);
    }

    return this.http.get<Paginated<Product>>('/api/v1/catalog/products', {
      params: httpParams,
    });
  }
}
