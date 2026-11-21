import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { CaptchaComponent } from '@components/captcha/captcha.component';
import { HoneypotComponent } from '@components/honeypot/honeypot.component';
import { PhoneFieldComponent } from '@components/phone-field/phone-field.component';
import { PrivacyConsentComponent } from '@components/privacy-consent/privacy-consent.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import { I18nService } from '@services/i18n.service';
import { TEXT_LIMITS } from '@utils/forms.util';
import { BookingFormStore } from '../booking-form.store';
import { BookingStepComponent } from '../booking-step/booking-step.component';

@Component({
  selector: 'rc-booking-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BookingStepComponent,
    TextFieldComponent,
    PhoneFieldComponent,
    HoneypotComponent,
    PrivacyConsentComponent,
    CaptchaComponent,
  ],
  templateUrl: './booking-contact.component.html',
  styleUrl: './booking-contact.component.scss',
})
export class BookingContactComponent {
  protected readonly store = inject(BookingFormStore);
  protected readonly t = inject(I18nService).t;
  protected readonly limits = TEXT_LIMITS;
  private readonly captcha = viewChild(CaptchaComponent);

  captchaNeeded(): boolean {
    return this.captcha()?.needed() ?? false;
  }

  resetCaptcha(): void {
    this.captcha()?.reset();
  }
}
