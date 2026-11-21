import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import type { Apartment, Channel } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { ConfirmService } from '@services/confirm.service';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';
import { BusyDirective } from '@directives/busy.directive';

const WEB_ADDRESS = /^https?:\/\/\S+$/i;

/** The e-chalupy.cz calendar of one apartment: its address, its state and reading it on request. */
@Component({
  selector: 'rc-apartment-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BusyDirective, IconComponent, TextFieldComponent],
  templateUrl: './apartment-calendar.component.html',
  styleUrl: './apartment-calendar.component.scss',
})
export class ApartmentCalendarComponent {
  /** Apartment the calendar belongs to. */
  readonly apartment = input.required<Apartment>();
  /** Its connected calendar; `null` when none is. */
  readonly channel = input<Channel | null>(null);
  /** The calendar after it was stored, read or disconnected (`null`). */
  readonly channelChange = output<Channel | null>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly address = linkedSignal(() => this.channel()?.import_url ?? '');
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected save(event: Event): void {
    event.preventDefault();
    const text = this.t().admin.channels;
    const address = this.address().trim();
    if (!WEB_ADDRESS.test(address)) {
      this.error.set(text.invalid);
      return;
    }
    this.error.set('');
    void this.run(async () => {
      const stored = await this.api.saveChannel(this.apartment().id, address);
      this.report(stored, text.saved, text.savedFailed);
    });
  }

  protected sync(channel: Channel): void {
    const text = this.t().admin.channels;
    void this.run(async () => {
      const read = await this.api.syncChannel(channel.id);
      this.report(read, text.synced, text.errors[read.error || 'unreachable']);
    });
  }

  protected async disconnect(): Promise<void> {
    const text = this.t().admin.channels;
    const question = this.i18n.fill(text.disconnectConfirm, {
      apartment: this.i18n.apartment(this.apartment()),
    });
    if (!(await this.confirm.ask(question, text.disconnect))) return;
    await this.run(async () => {
      await this.api.saveChannel(this.apartment().id, '');
      this.toasts.show(text.disconnected);
      this.channelChange.emit(null);
    });
  }

  private report(channel: Channel | null, done: string, failed: string): void {
    if (channel?.error) this.toasts.show(failed, 'error');
    else this.toasts.show(done);
    this.channelChange.emit(channel);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await action();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    } finally {
      this.busy.set(false);
    }
  }
}
