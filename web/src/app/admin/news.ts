import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Api, toFailure } from '../core/api';
import { todayISO } from '../core/dates';
import { checkedOf, valueOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import type { NewsItem } from '../core/models';
import { Seo } from '../core/seo';
import { Field } from '../ui/field';
import { Icon } from '../ui/icon';
import { Spinner } from '../ui/spinner';
import { Toasts } from '../ui/toast';

type Draft = Omit<NewsItem, 'id'> & { id?: number };

@Component({
  selector: 'rc-admin-news',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Field, Icon, Spinner],
  template: `
    <div class="a-head">
      <h1>{{ t().admin.news.title }}</h1>
      <div class="a-actions">
        <button type="button" class="btn" (click)="start()">
          <rc-icon name="plus" /> {{ t().admin.news.new }}
        </button>
      </div>
    </div>

    @if (draft(); as d) {
      <form class="a-card editor" (submit)="save($event)" novalidate>
        <h2>{{ d.id ? t().admin.news.edit : t().admin.news.new }}</h2>
        <div class="form-grid">
          <rc-field
            for="n-title-cs"
            [label]="t().admin.news.titleCs"
            [error]="errors()['title_cs']"
          >
            <input
              id="n-title-cs"
              class="input"
              type="text"
              lang="cs"
              [value]="d.title.cs"
              (input)="set('title', 'cs', value($event))"
              [attr.aria-invalid]="errors()['title_cs'] ? 'true' : null"
              aria-describedby="n-title-cs-msg"
            />
          </rc-field>
          <rc-field for="n-title-en" [label]="t().admin.news.titleEn">
            <input
              id="n-title-en"
              class="input"
              type="text"
              lang="en"
              [value]="d.title.en"
              (input)="set('title', 'en', value($event))"
              aria-describedby="n-title-en-msg"
            />
          </rc-field>
          <rc-field for="n-body-cs" [label]="t().admin.news.bodyCs" [error]="errors()['body_cs']">
            <textarea
              id="n-body-cs"
              class="input"
              rows="8"
              lang="cs"
              [value]="d.body.cs"
              (input)="set('body', 'cs', value($event))"
              [attr.aria-invalid]="errors()['body_cs'] ? 'true' : null"
              aria-describedby="n-body-cs-msg"
            ></textarea>
          </rc-field>
          <rc-field for="n-body-en" [label]="t().admin.news.bodyEn">
            <textarea
              id="n-body-en"
              class="input"
              rows="8"
              lang="en"
              [value]="d.body.en"
              (input)="set('body', 'en', value($event))"
              aria-describedby="n-body-en-msg"
            ></textarea>
          </rc-field>
          <rc-field for="n-date" [label]="t().admin.news.date" [error]="errors()['published_at']">
            <input
              id="n-date"
              class="input"
              type="date"
              [value]="d.published_at"
              (change)="patch({ published_at: value($event) })"
              aria-describedby="n-date-msg"
            />
          </rc-field>
          <label class="check publish">
            <input
              type="checkbox"
              [checked]="d.published"
              (change)="patch({ published: checked($event) })"
            />
            <span>{{ t().admin.news.published }}</span>
          </label>
        </div>
        @if (failure()) {
          <p class="notice is-error" role="alert">{{ failure() }}</p>
        }
        <div class="a-actions">
          <button class="btn" type="submit" [disabled]="busy()">{{ t().admin.news.save }}</button>
          <button class="btn btn-quiet" type="button" (click)="draft.set(null)">
            {{ t().admin.common.cancel }}
          </button>
        </div>
      </form>
    }

    @if (items(); as list) {
      @if (list.length) {
        <div class="a-table-wrap">
          <table class="a-table">
            <tbody>
              @for (n of list; track n.id) {
                <tr>
                  <td class="nowrap">{{ i18n.date(n.published_at.slice(0, 10)) }}</td>
                  <th scope="row">
                    {{ n.title.cs }}
                    @if (!n.published) {
                      <span class="tag">{{ t().admin.news.draft }}</span>
                    }
                    <span class="sub">{{ n.title.en }}</span>
                  </th>
                  <td>
                    <span class="a-row-actions">
                      <button
                        type="button"
                        class="a-icon-btn"
                        (click)="start(n)"
                        [attr.aria-label]="t().admin.news.edit + ': ' + n.title.cs"
                      >
                        <rc-icon name="edit" />
                      </button>
                      <button
                        type="button"
                        class="a-icon-btn is-danger"
                        (click)="remove(n)"
                        [attr.aria-label]="t().admin.news.delete + ': ' + n.title.cs"
                      >
                        <rc-icon name="trash" />
                      </button>
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="a-empty">{{ failed() ? t().common.loadFailed : t().admin.news.empty }}</p>
      }
    } @else {
      <rc-spinner [label]="t().common.loading" />
    }
  `,
  styles: `
    .editor {
      display: grid;
      gap: 18px;
      margin-bottom: 20px;
      border-top: 5px solid var(--timber);
    }
    .publish {
      align-self: end;
      padding-bottom: 12px;
    }
  `,
})
export class NewsAdminPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);

  protected readonly items = signal<NewsItem[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly draft = signal<Draft | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly busy = signal(false);
  protected readonly value = valueOf;
  protected readonly checked = checkedOf;

  constructor() {
    inject(Seo).noIndex(this.t().admin.news.title);
    this.load();
  }

  private load(): void {
    this.api.adminNews().then(
      (list) => this.items.set(list),
      () => {
        this.failed.set(true);
        this.items.set([]);
      },
    );
  }

  protected start(item?: NewsItem): void {
    this.errors.set({});
    this.failure.set('');
    this.draft.set(
      item
        ? {
            ...item,
            title: { ...item.title },
            body: { ...item.body },
            published_at: item.published_at.slice(0, 10),
          }
        : {
            title: { cs: '', en: '' },
            body: { cs: '', en: '' },
            published: true,
            published_at: todayISO(),
          },
    );
    window.scrollTo({ top: 0 });
  }

  protected set(field: 'title' | 'body', lang: 'cs' | 'en', text: string): void {
    this.draft.update((d) => (d ? { ...d, [field]: { ...d[field], [lang]: text } } : d));
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const d = this.draft();
    if (!d || this.busy()) return;
    this.busy.set(true);
    this.failure.set('');
    this.errors.set({});
    try {
      await this.api.saveNews(d);
      this.toasts.show(this.t().admin.bookings.saved);
      this.draft.set(null);
      this.load();
    } catch (err) {
      const failure = toFailure(err);
      if (failure.code === 'validation') {
        const messages: Record<string, string> = {};
        for (const field of Object.keys(failure.fields)) messages[field] = this.t().errors.required;
        this.errors.set(messages);
        this.failure.set(this.t().booking.fixErrors);
      } else {
        this.failure.set(this.t().admin.common.error);
      }
    } finally {
      this.busy.set(false);
    }
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
}
