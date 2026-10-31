import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@cafeqr/auth';
import { BrandingService } from '@cafeqr/config';
import { ROLE_LABELS, RoleName } from '@cafeqr/shared';
import { BrandMark } from '@cafeqr/ui';
import { KdsRealtimeService } from '../core/kds-realtime.service';

@Component({
  selector: 'app-kds-shell',
  imports: [RouterOutlet, BrandMark],
  templateUrl: './kds-shell.html',
})
export class KdsShell implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  readonly branding = inject(BrandingService);
  readonly realtime = inject(KdsRealtimeService);

  readonly user = this.auth.user;
  readonly now = signal(new Date());

  private readonly clockTimer = setInterval(
    () => this.now.set(new Date()),
    30_000,
  );

  readonly clock = computed(() =>
    new Intl.DateTimeFormat('es-CU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(this.now()),
  );

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

  ngOnInit(): void {
    this.realtime.connect();
  }

  ngOnDestroy(): void {
    clearInterval(this.clockTimer);
    this.realtime.disconnect();
  }

  logout(): void {
    this.realtime.disconnect();
    this.auth.logout();
  }
}
