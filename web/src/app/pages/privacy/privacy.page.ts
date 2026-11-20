import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiService } from '@services/api.service';
import { ConsentService } from '@services/consent.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.page.html',
  styleUrl: './privacy.page.scss',
})
export class PrivacyPage {
  protected readonly t = inject(I18nService).t;
  protected readonly consent = inject(ConsentService);
  /** Whether the forms use hCaptcha: only then the page mentions it. */
  protected readonly captcha = signal(false);

  constructor() {
    inject(SeoService).page(this.t().privacy.title);
    inject(ApiService)
      .config()
      .then((c) => this.captcha.set(!!c.hcaptcha_sitekey))
      .catch(() => undefined);
  }

  protected extra(id: string): string {
    return (this.t().privacy.withCaptcha as Record<string, string | undefined>)[id] ?? '';
  }
}
