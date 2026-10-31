import { Routes } from '@angular/router';
import { authGuard } from '@cafeqr/auth';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/pos-login').then((m) => m.PosLoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/pos-shell').then((m) => m.PosShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'order' },
      {
        path: 'order',
        loadComponent: () =>
          import('./pages/order/order-page').then((m) => m.OrderPage),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/orders/orders-page').then((m) => m.OrdersPage),
      },
      {
        path: 'cash',
        loadComponent: () =>
          import('./pages/cash/cash-page').then((m) => m.CashPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
