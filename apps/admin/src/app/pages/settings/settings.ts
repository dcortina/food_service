import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@cafeqr/auth';
import { SettingsApi } from '@cafeqr/api-client';
import { BrandingService } from '../../core/branding.service';
import { BrandMark } from '../../shared/brand-mark';

const MAX_LOGO_BYTES = 48 * 1024;

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, BrandMark],
  templateUrl: './settings.html',
})
export class SettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsApi = inject(SettingsApi);
  private readonly auth = inject(AuthService);
  private readonly branding = inject(BrandingService);

  readonly canManage = computed(() =>
    this.auth.hasPermission('configuracion.gestionar'),
  );

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly logoError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    ],
    logoUrl: [''],
  });

  readonly previewName = signal('CaféQR');
  readonly previewLogo = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.canManage()) {
      this.loading.set(false);
      return;
    }

    this.settingsApi.getBusiness().subscribe({
      next: (business) => {
        this.form.patchValue({
          nombre: business.nombre,
          logoUrl: business.logoUrl ?? '',
        });
        this.previewName.set(business.nombre);
        this.previewLogo.set(business.logoUrl);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la configuración del negocio.');
        this.loading.set(false);
      },
    });
  }

  syncPreview(): void {
    const value = this.form.getRawValue();
    this.previewName.set(value.nombre.trim() || 'CaféQR');
    this.previewLogo.set(this.normalizeLogo(value.logoUrl));
    this.logoError.set(null);
    this.success.set(null);
  }

  save(): void {
    if (!this.canManage() || this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const nombre = value.nombre.trim();
    const logoUrl = this.normalizeLogo(value.logoUrl);

    if (nombre.length < 2) {
      this.error.set('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    if (value.logoUrl.trim() && !logoUrl) {
      this.logoError.set(
        'Ingrese una URL http(s) válida, una ruta interna o suba una imagen.',
      );
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.logoError.set(null);

    this.settingsApi.updateBusiness({ nombre, logoUrl }).subscribe({
      next: (business) => {
        this.form.patchValue({
          nombre: business.nombre,
          logoUrl: business.logoUrl ?? '',
        });
        this.previewName.set(business.nombre);
        this.previewLogo.set(business.logoUrl);
        this.auth.updateBusinessBranding(business.nombre, business.logoUrl);
        this.branding.update(business.nombre, business.logoUrl);
        this.success.set('La identidad del negocio se actualizó correctamente.');
        this.saving.set(false);
      },
      error: () => {
        this.error.set(
          'No se pudieron guardar los cambios. Verifique sus permisos e intente de nuevo.',
        );
        this.saving.set(false);
      },
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.logoError.set(null);

    if (!file.type.startsWith('image/')) {
      this.logoError.set('El archivo seleccionado no es una imagen.');
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      this.logoError.set(
        'La imagen debe pesar menos de 48 KB. Use una URL para archivos más grandes.',
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.form.controls.logoUrl.setValue(result);
      this.previewLogo.set(result);
      this.success.set(null);
    };

    reader.onerror = () => {
      this.logoError.set('No se pudo leer la imagen seleccionada.');
    };

    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.form.controls.logoUrl.setValue('');
    this.previewLogo.set(null);
    this.logoError.set(null);
    this.success.set(null);
  }

  private normalizeLogo(value: string): string | null {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('data:image/')) {
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return trimmed;
    }

    try {
      const url = new URL(trimmed);
      return url.protocol === 'http:' || url.protocol === 'https:'
        ? trimmed
        : null;
    } catch {
      return null;
    }
  }
}
