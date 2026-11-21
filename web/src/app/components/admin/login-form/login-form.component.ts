import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LogoComponent } from '@components/logo/logo.component';
import { DEMO } from '@config/demo.config';
import { type ApiFailure } from '@models/api.model';
import { toFailure } from '@utils/api-failure.util';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';
import { valueOf } from '@utils/forms.util';
import { BusyDirective } from '@directives/busy.directive';

/**
 * Sign-in form. Reads `?expired` (shows why the owner was signed out) and `?next` (admin URL
 * to continue to) from the route.
 */
@Component({
  selector: 'rc-login-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BusyDirective, RouterLink, LogoComponent],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
})
export class LoginFormComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly notice = signal('');
  protected readonly isError = signal(true);
  protected readonly value = valueOf;
  protected readonly demo = DEMO;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  constructor() {
    if (DEMO) {
      this.email.set('admin@rychtacenkovice.cz');
      this.password.set('demo');
    }
    if (this.query.get('expired')) {
      this.isError.set(false);
      this.notice.set(this.t().admin.login.expired);
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.isError.set(true);
    if (!this.email().trim() || !this.password()) {
      this.notice.set(this.t().admin.login.invalid);
      return;
    }
    this.busy.set(true);
    this.notice.set('');
    try {
      await this.auth.login(this.email().trim(), this.password());
      const next = this.query.get('next');
      await this.router.navigateByUrl(next?.startsWith('/admin') ? next : '/admin');
    } catch (err) {
      this.password.set('');
      this.notice.set(this.explain(toFailure(err)));
    } finally {
      this.busy.set(false);
    }
  }

  private explain(failure: ApiFailure): string {
    const text = this.t().admin.login;
    if (failure.status === 429)
      return this.i18n.fill(text.limited, { min: Math.max(1, Math.ceil(failure.retryAfter / 60)) });
    if (failure.status === 401) return text.invalid;
    return failure.status === 0 ? this.t().errors.offline : this.t().errors.generic;
  }
}
