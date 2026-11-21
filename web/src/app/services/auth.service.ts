import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '@config/api.config';
import type { Session, User } from '@models/api.model';

const CSRF_HEADER = { 'X-Requested-With': 'rychta-web' };

/**
 * Session of the administration.
 *
 * - The access token (a JWT valid for about 10 minutes) lives only in memory, never in
 *   localStorage, so a script injected into the page cannot steal a long-lived credential.
 * - The refresh token is an HttpOnly, SameSite=Strict cookie the browser sends only to
 *   /api/v1/auth. It is rotated on every use; JavaScript never sees it.
 * - The token is renewed shortly before it expires, and once more on demand when a
 *   request comes back with 401.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
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
  /** Administrators also manage apartments, photos and accounts. */
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

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
