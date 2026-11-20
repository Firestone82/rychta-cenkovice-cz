import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, from, switchMap, throwError } from 'rxjs';
import { API_BASE } from './config';
import type { Session, User } from './models';

const CSRF_HEADER = { 'X-Requested-With': 'rychta-web' };

/**
 * Administrator session.
 *
 * - The access token (a JWT valid for about 10 minutes) lives only in memory, never in
 *   localStorage, so a script injected into the page cannot steal a long-lived credential.
 * - The refresh token is an HttpOnly, SameSite=Strict cookie the browser sends only to
 *   /api/v1/auth. It is rotated on every use; JavaScript never sees it.
 * - The token is renewed shortly before it expires, and once more on demand when a
 *   request comes back with 401.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE);
  private readonly router = inject(Router);

  private readonly token = signal<string | null>(null);
  private refreshing: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly channel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('rc-auth') : null;

  readonly user = signal<User | null>(null);
  readonly signedIn = computed(() => this.token() !== null);

  constructor() {
    // Signing out in one tab signs out the others.
    this.channel?.addEventListener('message', (event) => {
      if (event.data === 'signed-out') {
        this.clear();
        if (this.router.url.startsWith('/admin')) void this.router.navigate(['/admin/login']);
      }
    });
  }

  accessToken(): string | null {
    return this.token();
  }

  async login(email: string, password: string): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<Session>(
        `${this.base}/auth/login`,
        { email, password },
        { withCredentials: true, headers: CSRF_HEADER },
      ),
    );
    this.accept(session);
  }

  /** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
  refresh(): Promise<boolean> {
    this.refreshing ??= this.doRefresh().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  private async doRefresh(attempt = 0): Promise<boolean> {
    try {
      const session = await firstValueFrom(
        this.http.post<Session>(`${this.base}/auth/refresh`, null, {
          withCredentials: true,
          headers: CSRF_HEADER,
        }),
      );
      this.accept(session);
      return true;
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      // 409: another tab rotated the token a moment ago and the browser already has the new cookie.
      if (status === 409 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        return this.doRefresh(attempt + 1);
      }
      if (status === 401 || status === 403) this.clear();
      return false;
    }
  }

  /** True when there is a usable session (restoring it from the refresh cookie if needed). */
  async ensure(): Promise<boolean> {
    return this.signedIn() || (await this.refresh());
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.base}/auth/logout`, null, {
          withCredentials: true,
          headers: CSRF_HEADER,
        }),
      );
    } catch {
      /* the local session is dropped either way */
    }
    this.clear();
    this.channel?.postMessage('signed-out');
  }

  async changePassword(current: string, next: string): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<Session>(
        `${this.base}/auth/change-password`,
        { current_password: current, new_password: next },
        { withCredentials: true },
      ),
    );
    this.accept(session);
  }

  private accept(session: Session): void {
    this.token.set(session.access_token);
    this.user.set(session.user);
    if (this.timer) clearTimeout(this.timer);
    // Renew one minute before expiry (but not sooner than in 20 s).
    const delay = Math.max(20, session.expires_in - 60) * 1000;
    this.timer = setTimeout(() => void this.refresh(), delay);
  }

  private clear(): void {
    this.token.set(null);
    this.user.set(null);
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

/** Adds the bearer token to administration requests and retries once after a silent refresh. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE);
  if (!req.url.startsWith(base)) return next(req);
  const path = req.url.slice(base.length);
  const needsToken =
    path.startsWith('/admin/') || path === '/auth/me' || path === '/auth/change-password';
  if (!needsToken) return next(req);

  const auth = inject(Auth);
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

/** Lets only signed-in administrators into /admin; everyone else goes to the sign-in page. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (await auth.ensure()) return true;
  return router.createUrlTree(['/admin/login'], {
    queryParams: state.url && state.url !== '/admin' ? { next: state.url } : {},
  });
};

/** Keeps signed-in administrators away from the sign-in page. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return (await auth.ensure()) ? router.createUrlTree(['/admin']) : true;
};
