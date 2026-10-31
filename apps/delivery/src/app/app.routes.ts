import { Routes } from '@angular/router';
import { authGuard } from '@cafeqr/auth';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/delivery-login').then((m) => m.DeliveryLoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/delivery-shell').then((m) => m.DeliveryShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/orders/delivery-orders').then(
            (m) => m.DeliveryOrdersPage,
          ),
      },
      {
        path: 'liquidation',
        loadComponent: () =>
          import('./pages/liquidation/delivery-liquidation').then(
            (m) => m.DeliveryLiquidationPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
