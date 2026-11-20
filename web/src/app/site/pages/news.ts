import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Api } from '../../core/api';
import { I18n } from '../../core/i18n/i18n';
import type { NewsItem } from '../../core/models';
import { Seo } from '../../core/seo';
import { Spinner } from '../../ui/spinner';

@Component({
  selector: 'rc-news',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner],
  template: `
    <header class="wrap page-head">
      <h1 class="h1">{{ t().news.title }}</h1>
      <p class="lead">{{ t().news.lead }}</p>
    </header>

    <div class="wrap body">
      @if (items(); as list) {
        @if (list.length) {
          <ol class="list">
            @for (item of list; track item.id) {
              <li>
                <article>
                  <time [attr.datetime]="item.published_at">{{
                    i18n.date(item.published_at.slice(0, 10), 'long')
                  }}</time>
                  <div>
                    <h2 class="h2">{{ i18n.pick(item.title) }}</h2>
                    <div class="prose text">
                      @for (p of paragraphs(i18n.pick(item.body)); track $index) {
                        <p>{{ p }}</p>
                      }
                    </div>
                  </div>
                </article>
              </li>
            }
          </ol>
        } @else {
          <p class="notice">{{ failed() ? t().common.loadFailed : t().news.empty }}</p>
        }
      } @else {
        <rc-spinner [label]="t().common.loading" />
      }
    </div>
  `,
  styles: `
    .body {
      padding-bottom: var(--section);
    }
    .list {
      border-top: 2px solid var(--slate);
    }
    article {
      display: grid;
      grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
      gap: 12px clamp(24px, 5vw, 72px);
      padding: clamp(28px, 4vw, 48px) 0;
      border-bottom: 1px solid var(--line-strong);
    }
    time {
      color: var(--slate-2);
      font-weight: 700;
    }
    .text {
      margin-top: 14px;
    }
    @media (max-width: 720px) {
      article {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class NewsPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly items = signal<NewsItem[] | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    inject(Seo).page(this.t().news.title, this.t().news.lead);
    inject(Api)
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
