import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ChannelEditorComponent } from '@components/admin/channel-editor/channel-editor.component';
import {
  type ChannelRow,
  ChannelListComponent,
} from '@components/admin/channel-list/channel-list.component';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { Channel } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { ConfirmService } from '@services/confirm.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';
import { ToastService } from '@services/toast.service';

@Component({
  selector: 'rc-admin-channels-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent, ChannelListComponent, ChannelEditorComponent],
  templateUrl: './channels.page.html',
})
export class ChannelsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly rows = signal<ChannelRow[] | null>(null);
  protected readonly failed = signal(false);
  /** The row whose calendar address is in the editor. */
  protected readonly editing = signal<ChannelRow | null>(null);
  /** Id of the calendar being read on request. */
  protected readonly syncing = signal<number | null>(null);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  constructor() {
    inject(SeoService).noIndex(this.t().admin.channels.title);
    this.load();
  }

  protected stored(): void {
    this.editing.set(null);
    this.load();
  }

  protected async sync(channel: Channel): Promise<void> {
    const text = this.t().admin;
    this.syncing.set(channel.id);
    try {
      const { error } = await this.api.syncChannel(channel.id);
      if (error) this.toasts.show(text.channels.errors[error], 'error');
      else this.toasts.show(text.channels.synced);
    } catch {
      this.toasts.show(text.common.error, 'error');
    } finally {
      this.syncing.set(null);
      this.load();
    }
  }

  protected async disconnect(row: ChannelRow): Promise<void> {
    const text = this.t().admin;
    const question = this.i18n.fill(text.channels.disconnectConfirm, {
      apartment: this.i18n.apartment(row.apartment),
    });
    if (!(await this.confirm.ask(question, text.channels.disconnect))) return;
    try {
      await this.api.saveChannel(row.apartment.id, '');
      this.toasts.show(text.channels.disconnected);
      this.load();
    } catch {
      this.toasts.show(text.common.error, 'error');
    }
  }

  private load(): void {
    Promise.all([this.api.apartments(), this.api.channels()]).then(
      ([apartments, channels]) => {
        this.failed.set(false);
        this.rows.set(
          apartments.map((apartment) => ({
            apartment,
            channel: channels.find((channel) => channel.apartment_id === apartment.id) ?? null,
          })),
        );
      },
      () => {
        this.failed.set(true);
        this.rows.set([]);
      },
    );
  }
}
