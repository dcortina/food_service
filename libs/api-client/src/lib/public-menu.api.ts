import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PublicMenuPrice {
  monedaId: string;
  codigo: string;
  simbolo: string;
  precio: string;
}

export interface PublicMenuModifier {
  id: string;
  nombre: string;
  tipo: 'agregar' | 'quitar' | 'nota';
  precioExtra: string;
  orden: number;
}

export interface PublicMenuModifierGroup {
  id: string;
  nombre: string;
  tipo: 'unico' | 'multiple';
  minSeleccion: number;
  maxSeleccion: number;
  obligatorio: boolean;
  orden: number;
  modificadores: PublicMenuModifier[];
}

export interface PublicMenuProduct {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  disponible: boolean;
  tiempoPreparacionMin: number;
  precios: PublicMenuPrice[];
  gruposModificadores: PublicMenuModifierGroup[];
}

export interface PublicMenuCategory {
  id: string;
  nombre: string;
  orden: number;
  productos: PublicMenuProduct[];
}

export interface PublicMenu {
  negocio: {
    id: string;
    nombre: string;
    logoUrl: string | null;
    monedaPrincipal: {
      id: string;
      codigo: string;
      simbolo: string;
    };
  };
  sucursal: { id: string; nombre: string };
  mesa: { id: string; numero: string; codigoQr: string };
  categorias: PublicMenuCategory[];
}

@Injectable({ providedIn: 'root' })
export class PublicMenuApi {
  constructor(private readonly http: HttpClient) {}

  getMenu(codigoQr: string): Observable<PublicMenu> {
    return this.http.get<PublicMenu>(
      `/api/v1/public/menu/${encodeURIComponent(codigoQr)}`,
    );
  }
}
