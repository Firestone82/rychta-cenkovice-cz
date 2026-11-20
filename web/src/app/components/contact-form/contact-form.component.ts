import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CaptchaComponent } from '@components/captcha/captcha.component';

import { HoneypotComponent } from '@components/honeypot/honeypot.component';
import { IconComponent } from '@components/icon/icon.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import { PrivacyConsentComponent } from '@components/privacy-consent/privacy-consent.component';
import { ApiService } from '@services/api.service';
import { toFailure } from '@utils/api-failure.util';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { captchaSpent, fieldMessage, isEmail, isPhone, submitFailure } from '@utils/forms.util';
import { ContactSentComponent } from './contact-sent/contact-sent.component';

@Component({
  selector: 'rc-contact-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    TextFieldComponent,
    CaptchaComponent,
    HoneypotComponent,
    PrivacyConsentComponent,
    ContactSentComponent,
  ],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
  private readonly api = inject(ApiService);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly message = signal('');
  protected readonly consent = signal(false);
  protected readonly website = signal('');
  protected readonly captchaToken = signal('');
  private readonly captcha = viewChild(CaptchaComponent);

  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;
    const form = event.target as HTMLFormElement;
    if (this.show(this.validate(), form)) return;

    this.sending.set(true);
    this.failure.set('');
    try {
      await this.api.contact({
        name: this.name().trim(),
        email: this.email().trim(),
        phone: this.phone().trim(),
        message: this.message().trim(),
        consent: true,
        language: this.i18n.lang(),
        website: this.website(),
        captcha_token: this.captchaToken() || undefined,
      });
      this.sent.set(true);
    } catch (err) {
      const failure = toFailure(err);
      if (captchaSpent(failure)) this.captcha()?.reset();
      if (failure.code === 'validation' && this.show(failure.fields, form)) return;
      this.failure.set(submitFailure(this.t(), failure));
    } finally {
      this.sending.set(false);
    }
  }

  protected again(): void {
    this.captchaToken.set('');
    this.message.set('');
    this.errors.set({});
    this.failure.set('');
    this.sent.set(false);
  }

  private validate(): Record<string, string> {
    const codes: Record<string, string> = {};
    if (this.name().trim().length < 2) codes['name'] = 'required';
    if (!isEmail(this.email())) codes['email'] = 'invalid';
    if (this.phone().trim() && !isPhone(this.phone())) codes['phone'] = 'invalid';
    if (this.message().trim().length < 5) codes['message'] = 'required';
    if (!this.consent()) codes['consent'] = 'required';
    if (this.captcha()?.needed() && !this.captchaToken()) codes['captcha'] = 'required';
    return codes;
  }

  /** Shows field errors and focuses the first one. Returns true when there are any. */
  private show(codes: Record<string, string>, form: HTMLFormElement): boolean {
    const messages: Record<string, string> = {};
    for (const [field, code] of Object.entries(codes))
      messages[field] = fieldMessage(this.t(), field, code);
    this.errors.set(messages);
    if (!Object.keys(codes).length) return false;
    this.failure.set(this.t().booking.fixErrors);
    setTimeout(() =>
      form.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]')?.focus(),
    );
    return true;
  }
}
