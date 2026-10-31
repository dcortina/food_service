import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@cafeqr/auth';
import { BrandingService } from '@cafeqr/config';
import { PERMISSIONS, ROLE_LABELS, RoleName } from '@cafeqr/shared';
import { BrandMark } from '@cafeqr/ui';

interface PosNavItem {
  label: string;
  path: string;
  icon: string;
  permission: string;
  exact?: boolean;
}

@Component({
  selector: 'app-pos-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandMark],
  templateUrl: './pos-shell.html',
})
export class PosShell {
  private readonly auth = inject(AuthService);

  readonly branding = inject(BrandingService);
  readonly user = this.auth.user;

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

  private readonly allNav: PosNavItem[] = [
    {
      label: 'Nuevo pedido',
      path: '/order',
      permission: PERMISSIONS.PEDIDO_CREAR,
      icon: 'M12 4.5v15m7.5-7.5h-15',
    },
    {
      label: 'Pedidos',
      path: '/orders',
      permission: PERMISSIONS.PEDIDO_VER,
      icon: 'M7 3.75h8.25L19 7.5v12.75H7V3.75zM10 9h5M10 12.75h5M10 16.5h3.5',
    },
    {
      label: 'Caja',
      path: '/cash',
      permission: PERMISSIONS.CAJA_VER,
      icon: 'M3.75 7.5h16.5v9H3.75zM7.5 7.5v9M16.5 7.5v9M12 10.5v3',
    },
  ];

  readonly nav = computed(() =>
    this.allNav.filter((item) => this.auth.hasPermission(item.permission)),
  );

  logout(): void {
    this.auth.logout();
  }
}
