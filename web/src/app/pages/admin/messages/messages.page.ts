import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { MessageCardComponent } from '@components/admin/message-card/message-card.component';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import type { Message } from '@models/api.model';
import { ConfirmService } from '@services/confirm.service';
import { SeoService } from '@services/seo.service';
import { SkeletonComponent } from '@components/admin/skeleton/skeleton.component';
import { ToastService } from '@services/toast.service';
import { placeholderMessages } from '@utils/placeholders.util';

@Component({
  selector: 'rc-admin-messages-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent, MessageCardComponent],
  templateUrl: './messages.page.html',
  styleUrl: './messages.page.scss',
})
export class MessagesPage {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly box = signal<'' | 'archived'>('');
  protected readonly items = signal<Message[] | null>(null);
  protected readonly placeholders = placeholderMessages(4);
  protected readonly failed = signal(false);
  /** Id of the message whose change is being stored. */
  protected readonly busy = signal<number | null>(null);

  constructor() {
    inject(SeoService).noIndex(this.t().admin.messages.title);
    effect(() => {
      this.box();
      untracked(() => void this.load());
    });
  }

  private load(): Promise<void> {
    const box = this.box();
    return this.api.messages(box).then(
      (list) => {
        if (box !== this.box()) return;
        this.failed.set(false);
        this.items.set(list);
      },
      () => {
        this.failed.set(true);
        this.items.set([]);
      },
    );
  }

  protected async set(m: Message, status: Message['status']): Promise<void> {
    this.busy.set(m.id);
    try {
      await this.api.setMessageStatus(m.id, status);
      await this.load();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    } finally {
      this.busy.set(null);
    }
  }

  protected async remove(m: Message): Promise<void> {
    const text = this.t().admin.messages;
    if (!(await this.confirm.ask(text.deleteConfirm, text.delete))) return;
    this.busy.set(m.id);
    try {
      await this.api.deleteMessage(m.id);
      await this.load();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    } finally {
      this.busy.set(null);
    }
  }
}
