import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/menu-landing').then((m) => m.MenuLandingPage),
  },
  {
    path: 'qr/:codigoQr',
    loadComponent: () =>
      import('./pages/menu/menu-page').then((m) => m.MenuPage),
  },
  { path: '**', redirectTo: '' },
];
