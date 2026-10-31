import { Routes } from '@angular/router';
import { authGuard } from '@cafeqr/auth';

const comingSoon = (title: string) => ({
  loadComponent: () =>
    import('./pages/coming-soon/coming-soon').then((m) => m.ComingSoonPage),
  data: { title },
});

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
      { path: 'orders', ...comingSoon('Pedidos') },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./pages/catalog/catalog').then((m) => m.CatalogPage),
      },
      { path: 'tables', ...comingSoon('Mesas y códigos QR') },
      { path: 'cash', ...comingSoon('Caja') },
      { path: 'payments', ...comingSoon('Pagos') },
      { path: 'users', ...comingSoon('Usuarios y roles') },
      { path: 'reports', ...comingSoon('Reportes') },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
