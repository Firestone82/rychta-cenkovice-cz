import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import type { NewsItem } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { toFailure } from '@utils/api-failure.util';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';
import { todayISO } from '@utils/dates.util';
import { checkedOf } from '@utils/forms.util';

type NewsDraft = Omit<NewsItem, 'id'> & { id?: number };

function toDraft(item: NewsItem | null): NewsDraft {
  if (!item)
    return {
      title: { cs: '', en: '' },
      body: { cs: '', en: '' },
      published: true,
      published_at: todayISO(),
    };
  return {
    ...item,
    title: { ...item.title },
    body: { ...item.body },
    published_at: item.published_at.slice(0, 10),
  };
}

@Component({
  selector: 'rc-news-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent],
  templateUrl: './news-editor.component.html',
  styleUrl: './news-editor.component.scss',
})
export class NewsEditorComponent {
  /** News item to edit; `null` starts a new one. */
  readonly item = input.required<NewsItem | null>();
  /** The item was stored on the server. */
  readonly saved = output<void>();
  /** The owner closed the editor without saving. */
  readonly cancelled = output<void>();

  protected readonly t = inject(I18nService).t;
  protected readonly draft = linkedSignal<NewsDraft>(() => toDraft(this.item()));
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly busy = signal(false);
  protected readonly checked = checkedOf;

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);

  protected setText(field: 'title' | 'body', lang: 'cs' | 'en', text: string): void {
    this.draft.update((d) => ({ ...d, [field]: { ...d[field], [lang]: text } }));
  }

  protected patch(change: Partial<NewsDraft>): void {
    this.draft.update((d) => ({ ...d, ...change }));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.busy.set(true);
    this.failure.set('');
    this.errors.set({});
    try {
      await this.api.saveNews(this.draft());
      this.toasts.show(this.t().admin.bookings.saved);
      this.saved.emit();
    } catch (err) {
      const failure = toFailure(err);
      if (failure.code === 'validation') {
        const required = this.t().errors.required;
        this.errors.set(Object.fromEntries(Object.keys(failure.fields).map((f) => [f, required])));
        this.failure.set(this.t().booking.fixErrors);
      } else {
        this.failure.set(this.t().admin.common.error);
      }
    } finally {
      this.busy.set(false);
    }
  }
}
