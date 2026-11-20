import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountIdentityComponent } from '@components/admin/account-identity/account-identity.component';
import { PasswordFormComponent } from '@components/admin/password-form/password-form.component';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-admin-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountIdentityComponent, PasswordFormComponent],
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
})
export class AccountPage {
  protected readonly t = inject(I18nService).t;

  constructor() {
    inject(SeoService).noIndex(this.t().admin.account.title);
  }
}
