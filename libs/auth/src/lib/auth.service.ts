import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthApi, AuthUser, LoginResponse } from '@cafeqr/api-client';

const ACCESS_KEY = 'cafeqr_access';
const REFRESH_KEY = 'cafeqr_refresh';
const USER_KEY = 'cafeqr_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessTokenState = signal<string | null>(
    this.readStorage(ACCESS_KEY),
  );
  private readonly refreshTokenState = signal<string | null>(
    this.readStorage(REFRESH_KEY),
  );
  private readonly userState = signal<AuthUser | null>(this.readUser());

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly refreshToken = this.refreshTokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(
    () => this.accessTokenState() !== null,
  );
  readonly hasSession = computed(
    () => this.accessTokenState() !== null || this.refreshTokenState() !== null,
  );

  constructor(
    private readonly authApi: AuthApi,
    private readonly router: Router,
  ) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.authApi
      .login(username, password)
      .pipe(tap((response) => this.setSession(response)));
  }

  refresh(): Observable<LoginResponse> {
    const refreshToken = this.refreshTokenState();

    if (!refreshToken) {
      return new Observable<LoginResponse>((subscriber) => {
        subscriber.error(new Error('No refresh token available'));
      });
    }

    return this.authApi
      .refresh(refreshToken)
      .pipe(tap((response) => this.setSession(response)));
  }

  logout(): void {
    const refreshToken = this.refreshTokenState();
    this.clearSession();

    if (refreshToken) {
      this.authApi.logout(refreshToken).subscribe({
        error: () => undefined,
      });
    }
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.accessTokenState.set(null);
    this.refreshTokenState.set(null);
    this.userState.set(null);
    void this.router.navigate(['/login']);
  }

  hasPermission(permission: string): boolean {
    return this.userState()?.permisos.includes(permission) ?? false;
  }

  updateBusinessBranding(nombre: string, logoUrl: string | null): void {
    const user = this.userState();

    if (!user) {
      return;
    }

    const updated: AuthUser = {
      ...user,
      negocio: { ...user.negocio, nombre, logoUrl },
    };

    this.userState.set(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  }

  private setSession(response: LoginResponse): void {
    localStorage.setItem(ACCESS_KEY, response.accessToken);
    localStorage.setItem(REFRESH_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.accessTokenState.set(response.accessToken);
    this.refreshTokenState.set(response.refreshToken);
    this.userState.set(response.user);
  }

  private readStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private readUser(): AuthUser | null {
    const raw = this.readStorage(USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
