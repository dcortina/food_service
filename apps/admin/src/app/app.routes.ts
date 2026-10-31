import { Routes } from '@angular/router';
import { authGuard } from '@cafeqr/auth';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/orders/orders').then((m) => m.AdminOrdersPage),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./pages/catalog/catalog').then((m) => m.CatalogPage),
      },
      {
        path: 'tables',
        loadComponent: () =>
          import('./pages/tables/tables').then((m) => m.TablesPage),
      },
      {
        path: 'cash',
        loadComponent: () =>
          import('./pages/cash/cash').then((m) => m.AdminCashPage),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./pages/payments/payments').then(
            (m) => m.AdminPaymentsPage,
          ),
      },
      {
        path: 'couriers',
        loadComponent: () =>
          import('./pages/couriers/couriers').then((m) => m.CouriersPage),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/users').then((m) => m.UsersPage),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports/reports').then((m) => m.ReportsPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
