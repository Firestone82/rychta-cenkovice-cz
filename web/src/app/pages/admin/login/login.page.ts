import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoginFormComponent } from '@components/admin/login-form/login-form.component';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-admin-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginFormComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  constructor() {
    inject(SeoService).noIndex(inject(I18nService).t().admin.login.title);
  }
}
