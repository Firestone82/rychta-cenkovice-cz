import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NewsEditorComponent } from '@components/admin/news-editor/news-editor.component';
import { NewsTableComponent } from '@components/admin/news-table/news-table.component';
import { IconComponent } from '@components/icon/icon.component';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { NewsItem } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';
import { ToastService } from '@services/toast.service';

@Component({
  selector: 'rc-admin-news-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SpinnerComponent, NewsEditorComponent, NewsTableComponent],
  templateUrl: './news.page.html',
  styleUrl: './news.page.scss',
})
export class NewsAdminPage {
  protected readonly t = inject(I18nService).t;
  protected readonly items = signal<NewsItem[] | null>(null);
  protected readonly failed = signal(false);
  /** Open editor: `item` is null for a new news item. */
  protected readonly editing = signal<{ item: NewsItem | null } | null>(null);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);

  constructor() {
    inject(SeoService).noIndex(this.t().admin.news.title);
    this.load();
  }

  protected start(item: NewsItem | null): void {
    this.editing.set({ item });
    window.scrollTo({ top: 0 });
  }

  protected done(): void {
    this.editing.set(null);
    this.load();
  }

  protected async remove(n: NewsItem): Promise<void> {
    if (!confirm(this.t().admin.news.deleteConfirm)) return;
    try {
      await this.api.deleteNews(n.id);
      this.load();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }

  private load(): void {
    this.api.news().then(
      (list) => this.items.set(list),
      () => {
        this.failed.set(true);
        this.items.set([]);
      },
    );
  }
}
