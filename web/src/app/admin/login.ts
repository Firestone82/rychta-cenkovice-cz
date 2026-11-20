import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toFailure } from '../core/api';
import { Auth } from '../core/auth';
import { valueOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import { Seo } from '../core/seo';
import { Logo } from '../ui/logo';

@Component({
  selector: 'rc-admin-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Logo],
  template: `
    <main class="page">
      <div class="gable" aria-hidden="true"><div class="boards"></div></div>
      <form class="card" (submit)="submit($event)" novalidate>
        <rc-logo />
        <h1 class="h2">{{ t().admin.login.title }}</h1>

        @if (notice()) {
          <p class="notice" [class.is-error]="isError()" role="alert">{{ notice() }}</p>
        }

        <div class="field">
          <label for="l-email">{{ t().admin.login.email }}</label>
          <input
            id="l-email"
            class="input"
            type="email"
            autocomplete="username"
            required
            autofocus
            [value]="email()"
            (input)="email.set(value($event))"
          />
        </div>
        <div class="field">
          <label for="l-password">{{ t().admin.login.password }}</label>
          <input
            id="l-password"
            class="input"
            type="password"
            autocomplete="current-password"
            required
            [value]="password()"
            (input)="password.set(value($event))"
          />
        </div>

        <button class="btn" type="submit" [disabled]="busy()">
          {{ busy() ? t().admin.login.submitting : t().admin.login.submit }}
        </button>
        <a class="back" [routerLink]="['/', i18n.lang()]">{{ t().admin.login.back }}</a>
      </form>
    </main>
  `,
  styles: `
    .page {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: 24px 16px;
      background: var(--slate);
      overflow: hidden;
    }
    /* the house gable, large, behind the form */
    .gable {
      position: absolute;
      left: 50%;
      bottom: 0;
      width: min(1100px, 150vw);
      aspect-ratio: 2 / 1.25;
      translate: -50% 0;
      background: var(--timber);
      color: rgba(243, 245, 244, 0.16);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
    }
    .gable .boards {
      width: 100%;
      height: 100%;
      background-size: 56px 40px;
      background-position:
        0 0,
        28px 0;
    }
    .card {
      position: relative;
      display: grid;
      gap: 18px;
      width: min(100%, 420px);
      padding: clamp(24px, 5vw, 40px);
      background: var(--white);
      border-radius: var(--radius);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      --logo-size: 40px;
    }
    .btn {
      width: 100%;
      min-height: 52px;
    }
    .back {
      justify-self: center;
    }
  `,
})
export class LoginPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly notice = signal('');
  protected readonly isError = signal(true);
  protected readonly value = valueOf;

  constructor() {
    inject(Seo).noIndex(this.t().admin.login.title);
    if (this.route.snapshot.queryParamMap.get('expired')) {
      this.isError.set(false);
      this.notice.set(this.t().admin.login.expired);
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    const l = this.t().admin.login;
    this.isError.set(true);
    if (!this.email().trim() || !this.password()) {
      this.notice.set(l.invalid);
      return;
    }
    this.busy.set(true);
    this.notice.set('');
    try {
      await this.auth.login(this.email().trim(), this.password());
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next && next.startsWith('/admin') ? next : '/admin');
    } catch (err) {
      const failure = toFailure(err);
      this.password.set('');
      this.notice.set(
        failure.status === 429
          ? this.i18n.fill(l.limited, { min: Math.max(1, Math.ceil(failure.retryAfter / 60)) })
          : failure.status === 401
            ? l.invalid
            : failure.status === 0
              ? this.t().errors.offline
              : this.t().errors.generic,
      );
    } finally {
      this.busy.set(false);
    }
  }
}
