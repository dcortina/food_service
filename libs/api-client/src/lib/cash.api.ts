import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ShiftMovement {
  id: string;
  tipo: string;
  monto: string;
  motivo: string;
  creadoEn: string;
}

export interface ShiftPayment {
  id: string;
  pedido: {
    id: string;
    codigoPublico: string;
    total: string;
    estadoPago: string;
    estadoCumplimiento: string;
  };
  metodo: string;
  estado: string;
  monto: string;
  montoRecibido: string | null;
  cambio: string | null;
  referenciaExterna: string | null;
  creadoEn: string;
}

export interface CashShift {
  id: string;
  caja: { id: string; nombre: string };
  cajero: { id: string; nombre: string; username: string };
  fechaOperativa: string;
  fondoInicial: string;
  estado: 'abierto' | 'cerrado';
  abiertoEn: string;
  cerradoEn: string | null;
  efectivoEsperado: string | null;
  efectivoContado: string | null;
  descuadre: string | null;
  totalElectronicoReportado: string;
  totalElectronicoConciliado: string;
  observaciones: string | null;
  movimientos: ShiftMovement[];
  pagos: ShiftPayment[];
}

export interface OpenShiftPayload {
  fondoInicial: string;
  cajaId?: string;
}

export interface CloseShiftPayload {
  efectivoContado: string;
  observaciones?: string;
}

@Injectable({ providedIn: 'root' })
export class CashApi {
  constructor(private readonly http: HttpClient) {}

  getCurrent(): Observable<CashShift> {
    return this.http.get<CashShift>('/api/v1/cash/shifts/current');
  }

  open(payload: OpenShiftPayload): Observable<CashShift> {
    return this.http.post<CashShift>('/api/v1/cash/shifts/open', payload);
  }

  close(id: string, payload: CloseShiftPayload): Observable<CashShift> {
    return this.http.post<CashShift>(
      `/api/v1/cash/shifts/${id}/close`,
      payload,
    );
  }
}
