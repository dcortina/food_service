import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SettingsApi } from '@cafeqr/api-client';
import { AuthService } from '@cafeqr/auth';

const DEFAULT_NAME = 'CaféQR';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly settingsApi = inject(SettingsApi);
  private readonly auth = inject(AuthService);
  private readonly title = inject(Title);

  private readonly nameState = signal(DEFAULT_NAME);
  private readonly logoState = signal<string | null>(null);

  readonly name = this.nameState.asReadonly();
  readonly logoUrl = this.logoState.asReadonly();
  readonly displayName = computed(
    () => this.nameState().trim() || DEFAULT_NAME,
  );

  constructor() {
    effect(() => {
      const business = this.auth.user()?.negocio;

      if (business) {
        this.nameState.set(business.nombre.trim() || DEFAULT_NAME);
        this.logoState.set(business.logoUrl ?? null);
      }
    });

    effect(() => {
      this.title.setTitle(`${this.displayName()} · Administración`);
    });
  }

  loadPublic(): void {
    if (this.auth.user()) {
      return;
    }

    this.settingsApi.getPublicBranding().subscribe({
      next: (branding) => {
        if (!this.auth.user()) {
          this.nameState.set(branding.nombre.trim() || DEFAULT_NAME);
          this.logoState.set(branding.logoUrl ?? null);
        }
      },
      error: () => undefined,
    });
  }

  update(name: string, logoUrl: string | null): void {
    this.nameState.set(name.trim() || DEFAULT_NAME);
    this.logoState.set(logoUrl);
  }
}
