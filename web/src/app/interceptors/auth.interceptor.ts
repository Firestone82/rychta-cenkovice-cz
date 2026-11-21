import type { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE } from '@config/api.config';
import { AuthService } from '@services/auth.service';

/** Adds the bearer token to administration requests and retries once after a silent refresh. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE);
  if (!req.url.startsWith(base)) return next(req);
  const path = req.url.slice(base.length);
  const needsToken =
    path.startsWith('/admin/') || path === '/auth/me' || path === '/auth/change-password';
  if (!needsToken) return next(req);

  const auth = inject(AuthService);
  const withToken = () => {
    const token = auth.accessToken();
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  };
  return next(withToken()).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return from(auth.refresh()).pipe(
        switchMap((ok) => {
          if (ok) return next(withToken());
          return throwError(() => err);
        }),
      );
    }),
  );
};
