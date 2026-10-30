import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { DashboardResponse, ReportsApi } from '@cafeqr/api-client';

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

interface DashboardState {
  loading: boolean;
  data: DashboardResponse | null;
  error: string | null;
  desde: string;
  hasta: string;
}

export const DashboardStore = signalStore(
  withState<DashboardState>({
    loading: false,
    data: null,
    error: null,
    desde: today(),
    hasta: today(),
  }),
  withMethods((store, reportsApi = inject(ReportsApi)) => ({
    async load(desde?: string, hasta?: string): Promise<void> {
      const hasRange = Boolean(desde && hasta);

      patchState(store, {
        loading: true,
        error: null,
        ...(hasRange ? { desde, hasta } : {}),
      });

      try {
        const data = await firstValueFrom(reportsApi.getDashboard(desde, hasta));
        patchState(store, {
          data,
          loading: false,
          desde: data.rango.desde,
          hasta: data.rango.hasta,
        });
      } catch {
        patchState(store, {
          error:
            'No se pudo cargar el dashboard. Verifique la conexión e intente de nuevo.',
          loading: false,
        });
      }
    },
  })),
);
