import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@cafeqr/auth';
import { BrandingService } from '../../core/branding.service';
import { BrandMark } from '../../shared/brand-mark';
import { BurgerHero } from '../../shared/burger-hero';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, BrandMark, BurgerHero],
  templateUrl: './login.html',
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly branding = inject(BrandingService);
  readonly features = ['Pedidos', 'Cocina', 'Caja', 'Reportes'];
  readonly currentYear = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (this.auth.hasSession()) {
      void this.router.navigate(['/dashboard']);
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
      next: () => void this.router.navigate(['/dashboard']),
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
