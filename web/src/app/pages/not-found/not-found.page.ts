import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.scss',
})
export class NotFoundPage {
  protected readonly links = inject(LinksService);
  protected readonly t = inject(I18nService).t;

  constructor() {
    const seo = inject(SeoService);
    seo.page(this.t().notFound.title);
  }
}
