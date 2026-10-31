import { Routes } from '@angular/router';
import { authGuard } from '@cafeqr/auth';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/kds-login').then((m) => m.KdsLoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/kds-shell').then((m) => m.KdsShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'board' },
      {
        path: 'board',
        loadComponent: () =>
          import('./pages/board/kds-board').then((m) => m.KdsBoardPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
