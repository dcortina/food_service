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

export interface Currency {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string | null;
  activo: boolean;
}

export interface CreateCategoryPayload {
  nombre: string;
  orden?: number;
  activo?: boolean;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export interface ProductPricePayload {
  monedaId: string;
  precio: string;
}

export interface CreateProductPayload {
  categoriaId: string;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  disponible?: boolean;
  tiempoPreparacionMin?: number;
  precios: ProductPricePayload[];
  grupoIds?: string[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

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
  productosCount?: number;
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
  disponibleDesde?: string | null;
  disponibleHasta?: string | null;
  diasSemana?: number[];
  tiempoPreparacionMin: number;
  impuestoPorcentaje?: string | null;
  orden?: number;
  activo?: boolean;
  precios: ProductPrice[];
  gruposModificadores: ModifierGroup[];
}

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  constructor(private readonly http: HttpClient) {}

  listCurrencies(): Observable<Currency[]> {
    return this.http.get<Currency[]>('/api/v1/catalog/currencies');
  }

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/v1/catalog/categories');
  }

  listModifierGroups(): Observable<ModifierGroup[]> {
    return this.http.get<ModifierGroup[]>(
      '/api/v1/catalog/modifier-groups',
    );
  }

  createCategory(payload: CreateCategoryPayload): Observable<Category> {
    return this.http.post<Category>('/api/v1/catalog/categories', payload);
  }

  updateCategory(
    id: string,
    payload: UpdateCategoryPayload,
  ): Observable<Category> {
    return this.http.patch<Category>(
      `/api/v1/catalog/categories/${id}`,
      payload,
    );
  }

  listProducts(
    params: {
      search?: string;
      categoriaId?: string;
      pageSize?: number;
      disponible?: boolean | 'all';
    } = {},
  ): Observable<Paginated<Product>> {
    let httpParams = new HttpParams().set(
      'pageSize',
      String(params.pageSize ?? 100),
    );

    if (params.disponible !== 'all') {
      httpParams = httpParams.set(
        'disponible',
        String(params.disponible ?? true),
      );
    }

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

  createProduct(payload: CreateProductPayload): Observable<Product> {
    return this.http.post<Product>('/api/v1/catalog/products', payload);
  }

  updateProduct(
    id: string,
    payload: UpdateProductPayload,
  ): Observable<Product> {
    return this.http.patch<Product>(
      `/api/v1/catalog/products/${id}`,
      payload,
    );
  }
}
