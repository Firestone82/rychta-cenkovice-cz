import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import type { NewsItem } from '@models/api.model';
import { SeoService } from '@services/seo.service';
import { SpinnerComponent } from '@components/spinner/spinner.component';

@Component({
  selector: 'rc-news',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent],
  templateUrl: './news.page.html',
  styleUrl: './news.page.scss',
})
export class NewsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly items = signal<NewsItem[] | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    inject(SeoService).page(this.t().news.title, this.t().news.lead);
    inject(ApiService)
      .news()
      .then(
        (list) => this.items.set(list),
        () => {
          this.failed.set(true);
          this.items.set([]);
        },
      );
  }

  protected paragraphs(text: string): string[] {
    return text
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
}
