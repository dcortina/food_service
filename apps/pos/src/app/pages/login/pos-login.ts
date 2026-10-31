import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@cafeqr/auth';
import { BrandingService } from '@cafeqr/config';
import { BrandMark } from '@cafeqr/ui';

@Component({
  selector: 'app-pos-login',
  imports: [ReactiveFormsModule, BrandMark],
  templateUrl: './pos-login.html',
})
export class PosLoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly branding = inject(BrandingService);
  readonly currentYear = new Date().getFullYear();
  readonly features = ['Pedidos', 'Caja', 'Cobros'];

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (this.auth.hasSession()) {
      void this.router.navigate(['/order']);
    }
  }

  ngOnInit(): void {
    this.branding.loadPublic();
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(username, password).subscribe({
      next: () => void this.router.navigate(['/order']),
      error: () => {
        this.error.set(
          'Usuario o contraseña incorrectos. Verifique sus credenciales.',
        );
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }
}
