import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContactDetailsComponent } from '@components/contact-details/contact-details.component';
import { ContactFormComponent } from '@components/contact-form/contact-form.component';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContactDetailsComponent, ContactFormComponent],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.scss',
})
export class ContactPage {
  protected readonly t = inject(I18nService).t;

  constructor() {
    inject(SeoService).page(this.t().contact.title, this.t().contact.lead);
  }
}
