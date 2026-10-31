import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@cafeqr/auth';
import { BrandingService } from '@cafeqr/config';
import { PERMISSIONS, ROLE_LABELS, RoleName } from '@cafeqr/shared';
import { BrandMark } from '@cafeqr/ui';

interface DeliveryNavItem {
  label: string;
  path: string;
  icon: string;
  permission: string;
  exact?: boolean;
}

@Component({
  selector: 'app-delivery-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandMark],
  templateUrl: './delivery-shell.html',
})
export class DeliveryShell {
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

  private readonly allNav: DeliveryNavItem[] = [
    {
      label: 'Mis entregas',
      path: '/orders',
      permission: PERMISSIONS.REPARTIDOR_VER,
      icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
    },
    {
      label: 'Liquidación',
      path: '/liquidation',
      permission: PERMISSIONS.REPARTIDOR_VER,
      icon: 'M12 6v12m3-9.75c0-1.24-1.34-2.25-3-2.25s-3 1.01-3 2.25 1.34 2.25 3 2.25 3 1.01 3 2.25-1.34 2.25-3 2.25-3-1.01-3-2.25',
    },
  ];

  readonly nav = computed(() =>
    this.allNav.filter((item) => this.auth.hasPermission(item.permission)),
  );

  logout(): void {
    this.auth.logout();
  }
}
