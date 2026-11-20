import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import { toFailure } from '@utils/api-failure.util';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';

const MIN_PASSWORD_LENGTH = 12;

@Component({
  selector: 'rc-password-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent],
  templateUrl: './password-form.component.html',
  styleUrl: './password-form.component.scss',
})
export class PasswordFormComponent {
  protected readonly auth = inject(AuthService);
  protected readonly t = inject(I18nService).t;
  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly repeat = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly busy = signal(false);

  private readonly toasts = inject(ToastService);

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    const text = this.t().admin.account;
    const errors: Record<string, string> = {};
    if (!this.current()) errors['current'] = this.t().errors.required;
    if (this.next().length < MIN_PASSWORD_LENGTH) errors['next'] = text.tooShort;
    if (this.repeat() !== this.next()) errors['repeat'] = text.mismatch;
    this.errors.set(errors);
    this.failure.set('');
    if (Object.keys(errors).length) return;

    this.busy.set(true);
    try {
      await this.auth.changePassword(this.current(), this.next());
      this.current.set('');
      this.next.set('');
      this.repeat.set('');
      this.toasts.show(text.changed);
    } catch (err) {
      const failure = toFailure(err);
      if (failure.fields['current_password']) this.errors.set({ current: text.wrong });
      else if (failure.fields['new_password']) this.errors.set({ next: text.tooShort });
      else this.failure.set(this.t().admin.common.error);
    } finally {
      this.busy.set(false);
    }
  }
}
