import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@cafeqr/auth';
import { ROLE_LABELS, RoleName } from '@cafeqr/shared';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly mobileOpen = signal(false);

  readonly roleLabel = computed(() => {
    const role = this.user()?.rol as RoleName | undefined;
    return role ? (ROLE_LABELS[role] ?? role) : '';
  });

  readonly initials = computed(() => {
    const name = this.user()?.nombre ?? '';

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  readonly nav: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      exact: true,
      icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
    },
    {
      label: 'Pedidos',
      path: '/orders',
      icon: 'M7 3.75h8.25L19 7.5v12.75H7V3.75zM10 9h5M10 12.75h5M10 16.5h3.5',
    },
    {
      label: 'Catálogo',
      path: '/catalog',
      icon: 'M4.5 6.75h15M4.5 12h15M4.5 17.25h9',
    },
    {
      label: 'Mesas y QR',
      path: '/tables',
      icon: 'M4 6.75h16v4.5H4zM4 11.25v7.5M20 11.25v7.5M9 15h6',
    },
    {
      label: 'Caja',
      path: '/cash',
      icon: 'M3.75 7.5h16.5v9H3.75zM7.5 7.5v9M16.5 7.5v9M12 10.5v3',
    },
    {
      label: 'Pagos',
      path: '/payments',
      icon: 'M3.75 6.75h16.5v10.5H3.75zM3.75 10.5h16.5M7.5 15h3',
    },
    {
      label: 'Usuarios',
      path: '/users',
      icon: 'M15.75 19.5v-1.5a3.75 3.75 0 00-3.75-3.75H7.5a3.75 3.75 0 00-3.75 3.75v1.5M9.75 10.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM20.25 19.5v-1.5a3.75 3.75 0 00-2.813-3.628M15.75 3.232a3.75 3.75 0 010 7.036',
    },
    {
      label: 'Reportes',
      path: '/reports',
      icon: 'M4.5 19.5V4.5M4.5 19.5h15M8.25 16.5v-4.5M12 16.5V7.5M15.75 16.5v-7.5',
    },
    {
      label: 'Configuración',
      path: '/settings',
      icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
    },
  ];

  openMobile(): void {
    this.mobileOpen.set(true);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
