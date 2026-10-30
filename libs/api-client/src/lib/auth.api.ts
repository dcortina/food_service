import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginResponse } from './api.types';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  constructor(private readonly http: HttpClient) {}

  login(
    username: string,
    password: string,
  ): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/login', {
      username,
      password,
    });
  }

  refresh(refreshToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/refresh', {
      refreshToken,
    });
  }

  logout(refreshToken: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      '/api/v1/auth/logout',
      { refreshToken },
    );
  }
}
