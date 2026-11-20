import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { I18n } from '../core/i18n/i18n';
import type { Message } from '../core/models';
import { Seo } from '../core/seo';
import { Icon } from '../ui/icon';
import { Spinner } from '../ui/spinner';
import { Toasts } from '../ui/toast';

@Component({
  selector: 'rc-admin-messages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner],
  template: `
    <div class="a-head">
      <h1>{{ t().admin.messages.title }}</h1>
    </div>

    <div class="a-filters">
      <div class="a-seg" role="group" [attr.aria-label]="t().admin.messages.title">
        <button type="button" [attr.aria-pressed]="box() === ''" (click)="box.set('')">
          {{ t().admin.messages.filterInbox }}
        </button>
        <button
          type="button"
          [attr.aria-pressed]="box() === 'archived'"
          (click)="box.set('archived')"
        >
          {{ t().admin.messages.filterArchived }}
        </button>
      </div>
    </div>

    @if (items(); as list) {
      @if (list.length) {
        <ul class="list">
          @for (m of list; track m.id) {
            <li class="a-card" [class.is-new]="m.status === 'new'">
              <header>
                <div>
                  <h2>
                    {{ m.name }}
                    @if (m.status === 'new') {
                      <span class="tag tag-new">{{ t().admin.messages.status.new }}</span>
                    }
                    @if (m.booking_id) {
                      <a
                        class="tag tag-confirmed"
                        [routerLink]="['/admin/bookings', m.booking_id]"
                        >{{ t().admin.messages.bookingCreated }}</a
                      >
                    }
                  </h2>
                  <p class="meta">
                    <a [href]="'mailto:' + m.email">{{ m.email }}</a>
                    @if (m.phone) {
                      <a [href]="'tel:' + m.phone.replaceAll(' ', '')">{{ m.phone }}</a>
                    }
                    <time [attr.datetime]="m.created_at">{{ i18n.dateTime(m.created_at) }}</time>
                  </p>
                </div>
              </header>
              <p class="body">{{ m.body }}</p>
              <div class="a-actions">
                <a
                  class="btn btn-small"
                  routerLink="/admin/bookings/new"
                  [queryParams]="{ message: m.id }"
                  ><rc-icon name="plus" /> {{ t().admin.messages.createBooking }}</a
                >
                <a class="btn btn-small btn-quiet" [href]="'mailto:' + m.email"
                  ><rc-icon name="mail" /> {{ t().admin.messages.reply }}</a
                >
                @if (m.status === 'new') {
                  <button type="button" class="btn btn-small btn-quiet" (click)="set(m, 'read')">
                    {{ t().admin.messages.markRead }}
                  </button>
                } @else if (m.status === 'read') {
                  <button type="button" class="btn btn-small btn-quiet" (click)="set(m, 'new')">
                    {{ t().admin.messages.markNew }}
                  </button>
                }
                @if (m.status === 'archived') {
                  <button type="button" class="btn btn-small btn-quiet" (click)="set(m, 'read')">
                    {{ t().admin.messages.unarchive }}
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn-small btn-quiet"
                    (click)="set(m, 'archived')"
                  >
                    {{ t().admin.messages.archive }}
                  </button>
                }
                <button type="button" class="btn btn-small btn-danger" (click)="remove(m)">
                  <rc-icon name="trash" /> {{ t().admin.messages.delete }}
                </button>
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="a-empty">{{ failed() ? t().common.loadFailed : t().admin.messages.empty }}</p>
      }
    } @else {
      <rc-spinner [label]="t().common.loading" />
    }
  `,
  styles: `
    .list {
      display: grid;
      gap: 12px;
    }
    li.is-new {
      border-left: 5px solid var(--timber);
    }
    h2 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
      font-size: 1.2rem;
      font-weight: 700;
    }
    h2 .tag {
      font-family: var(--font-body);
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 18px;
      font-size: 0.95rem;
      color: var(--slate-2);
    }
    .body {
      margin: 14px 0 16px;
      max-width: 64em;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class MessagesPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);

  protected readonly box = signal<'' | 'archived'>('');
  protected readonly items = signal<Message[] | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    inject(Seo).noIndex(this.t().admin.messages.title);
    effect(() => {
      this.box();
      untracked(() => this.load());
    });
  }

  private load(): void {
    const box = this.box();
    this.api.messages(box).then(
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
    try {
      await this.api.setMessageStatus(m.id, status);
      this.load();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }

  protected async remove(m: Message): Promise<void> {
    if (!confirm(this.t().admin.messages.deleteConfirm)) return;
    try {
      await this.api.deleteMessage(m.id);
      this.load();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }
}
