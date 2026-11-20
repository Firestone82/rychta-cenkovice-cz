import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiService } from '@services/api.service';
import { type ConsentChoice, ConsentService } from '@services/consent.service';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';
import { CookieBarComponent } from './cookie-bar/cookie-bar.component';
import { CookieSettingsComponent } from './cookie-settings/cookie-settings.component';

/**
 * The cookie bar of a first visit and the settings dialog behind it. Refusing takes
 * one click, the same as allowing, and nothing optional is switched on beforehand.
 */
@Component({
  selector: 'rc-cookie-consent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CookieBarComponent, CookieSettingsComponent],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.scss',
})
export class CookieConsentComponent {
  protected readonly consent = inject(ConsentService);
  /** Whether the site uses hCaptcha at all; without it there is no third kind to choose. */
  protected readonly hasExternal = signal(false);

  private readonly t = inject(I18nService).t;
  private readonly toasts = inject(ToastService);

  constructor() {
    inject(ApiService)
      .config()
      .then((c) => this.hasExternal.set(!!c.hcaptcha_sitekey))
      .catch(() => undefined);
  }

  protected acceptAll(): void {
    this.save({ preferences: true, external: this.hasExternal() });
  }

  protected necessary(): void {
    this.consent.necessaryOnly();
    this.done();
  }

  protected save(choice: ConsentChoice): void {
    this.consent.save(choice);
    this.done();
  }

  private done(): void {
    const wasOpen = this.consent.settingsOpen();
    this.consent.settingsOpen.set(false);
    if (wasOpen) this.toasts.show(this.t().cookies.saved);
  }
}
