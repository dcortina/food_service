import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsApi } from '@cafeqr/api-client';
import { BrandMark } from '@cafeqr/ui';

@Component({
  selector: 'app-menu-landing',
  imports: [FormsModule, BrandMark],
  templateUrl: './menu-landing.html',
})
export class MenuLandingPage implements OnInit {
  private readonly router = inject(Router);
  private readonly settingsApi = inject(SettingsApi);

  readonly brandName = signal('CaféQR');
  readonly logoUrl = signal<string | null>(null);
  readonly code = signal('');
  readonly error = signal<string | null>(null);
  readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.settingsApi.getPublicBranding().subscribe({
      next: (branding) => {
        this.brandName.set(branding.nombre || 'CaféQR');
        this.logoUrl.set(branding.logoUrl);
      },
      error: () => undefined,
    });
  }

  openMenu(): void {
    const raw = this.code().trim();

    if (!raw) {
      this.error.set('Ingrese el código o la URL del QR de su mesa.');
      return;
    }

    const code = raw.split('/').filter(Boolean).pop() ?? '';
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        code,
      );

    if (!isUuid) {
      this.error.set('El código QR no tiene un formato válido.');
      return;
    }

    this.error.set(null);
    void this.router.navigate(['/qr', code]);
  }
}
