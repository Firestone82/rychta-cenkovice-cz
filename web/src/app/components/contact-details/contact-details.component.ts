import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { SITE } from '@config/site.config';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-contact-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './contact-details.component.html',
  styleUrl: './contact-details.component.scss',
})
export class ContactDetailsComponent {
  protected readonly t = inject(I18nService).t;
  protected readonly contact = SITE.contact;
}
