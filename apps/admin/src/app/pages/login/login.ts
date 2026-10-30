import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@cafeqr/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly highlights = [
    'Pedidos y KDS en tiempo real',
    'Caja con arqueo ciego y conciliación',
    'Reportes de ventas y exportación CSV',
  ];

  constructor() {
    if (this.auth.hasSession()) {
      void this.router.navigate(['/dashboard']);
    }
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
