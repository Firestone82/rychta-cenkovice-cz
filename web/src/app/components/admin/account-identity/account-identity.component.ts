import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-account-identity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './account-identity.component.html',
  styleUrl: './account-identity.component.scss',
})
export class AccountIdentityComponent {
  protected readonly auth = inject(AuthService);
  protected readonly t = inject(I18nService).t;
}
