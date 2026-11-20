import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toFailure } from '../core/api';
import { Auth } from '../core/auth';
import { valueOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import { Seo } from '../core/seo';
import { Field } from '../ui/field';
import { Toasts } from '../ui/toast';

@Component({
  selector: 'rc-admin-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field],
  template: `
    <div class="a-head">
      <h1>{{ t().admin.account.title }}</h1>
    </div>

    <div class="cols">
      <section class="a-card">
        <h2>{{ t().admin.account.signedInAs }}</h2>
        <p class="who">
          <strong>{{ auth.user()?.name || auth.user()?.email }}</strong>
          <span>{{ auth.user()?.email }}</span>
        </p>
        <p class="muted session">{{ t().admin.account.session }}</p>
      </section>

      <form class="a-card" (submit)="save($event)" novalidate>
        <h2>{{ t().admin.account.changePassword }}</h2>
        <!-- lets password managers attach the new password to the right account -->
        <input
          class="sr-only"
          type="text"
          autocomplete="username"
          tabindex="-1"
          aria-hidden="true"
          [value]="auth.user()?.email ?? ''"
          readonly
        />
        <rc-field
          for="ac-current"
          [label]="t().admin.account.current"
          [error]="errors()['current']"
        >
          <input
            id="ac-current"
            class="input"
            type="password"
            autocomplete="current-password"
            required
            [value]="current()"
            (input)="current.set(value($event))"
            [attr.aria-invalid]="errors()['current'] ? 'true' : null"
            aria-describedby="ac-current-msg"
          />
        </rc-field>
        <rc-field
          for="ac-next"
          [label]="t().admin.account.next"
          [hint]="t().admin.account.nextHint"
          [error]="errors()['next']"
        >
          <input
            id="ac-next"
            class="input"
            type="password"
            autocomplete="new-password"
            required
            minlength="12"
            [value]="next()"
            (input)="next.set(value($event))"
            [attr.aria-invalid]="errors()['next'] ? 'true' : null"
            aria-describedby="ac-next-msg"
          />
        </rc-field>
        <rc-field for="ac-repeat" [label]="t().admin.account.repeat" [error]="errors()['repeat']">
          <input
            id="ac-repeat"
            class="input"
            type="password"
            autocomplete="new-password"
            required
            [value]="repeat()"
            (input)="repeat.set(value($event))"
            [attr.aria-invalid]="errors()['repeat'] ? 'true' : null"
            aria-describedby="ac-repeat-msg"
          />
        </rc-field>
        @if (failure()) {
          <p class="notice is-error" role="alert">{{ failure() }}</p>
        }
        <button class="btn" type="submit" [disabled]="busy()">{{ t().admin.account.save }}</button>
      </form>
    </div>
  `,
  styles: `
    .cols {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
      gap: 14px;
      align-items: start;
      max-width: 860px;
    }
    form {
      display: grid;
      gap: 12px;
      justify-items: start;
    }
    form rc-field {
      width: 100%;
    }
    .who {
      display: grid;
      font-size: 1rem;
    }
    .who span {
      color: var(--slate-2);
    }
    .session {
      margin-top: 16px;
    }
  `,
})
export class AccountPage {
  protected readonly auth = inject(Auth);
  protected readonly t = inject(I18n).t;
  private readonly toasts = inject(Toasts);

  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly repeat = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly busy = signal(false);
  protected readonly value = valueOf;

  constructor() {
    inject(Seo).noIndex(this.t().admin.account.title);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    const a = this.t().admin.account;
    const errors: Record<string, string> = {};
    if (!this.current()) errors['current'] = this.t().errors.required;
    if (this.next().length < 12) errors['next'] = a.tooShort;
    if (this.repeat() !== this.next()) errors['repeat'] = a.mismatch;
    this.errors.set(errors);
    this.failure.set('');
    if (Object.keys(errors).length) return;

    this.busy.set(true);
    try {
      await this.auth.changePassword(this.current(), this.next());
      this.current.set('');
      this.next.set('');
      this.repeat.set('');
      this.toasts.show(a.changed);
    } catch (err) {
      const failure = toFailure(err);
      if (failure.fields['current_password']) this.errors.set({ current: a.wrong });
      else if (failure.fields['new_password']) this.errors.set({ next: a.tooShort });
      else this.failure.set(this.t().admin.common.error);
    } finally {
      this.busy.set(false);
    }
  }
}
