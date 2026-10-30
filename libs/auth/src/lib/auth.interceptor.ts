import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const isApiRequest = request.url.startsWith('/api');

  const authenticatedRequest =
    token && isApiRequest
      ? request.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthRequest =
        request.url.includes('/auth/login') ||
        request.url.includes('/auth/refresh');

      if (error.status !== 401 || isAuthRequest) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap(() => {
          const refreshedToken = auth.accessToken();
          return next(
            request.clone({
              setHeaders: { Authorization: `Bearer ${refreshedToken}` },
            }),
          );
        }),
        catchError(() => {
          auth.clearSession();
          return throwError(() => error);
        }),
      );
    }),
  );
};
