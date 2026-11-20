import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import type { NewsItem } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-news-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './news-table.component.html',
  styleUrl: './news-table.component.scss',
})
export class NewsTableComponent {
  /** News items to list, newest first as the API returns them. */
  readonly items = input.required<NewsItem[]>();
  /** The owner wants to edit this item. */
  readonly edit = output<NewsItem>();
  /** The owner wants to delete this item; not confirmed yet. */
  readonly remove = output<NewsItem>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
