import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ModalComponent } from '@components/admin/modal/modal.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import type { Apartment, Channel } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';

const WEB_ADDRESS = /^https?:\/\/\S+$/i;

/** A window for the address of an apartment's calendar on e-chalupy.cz. */
@Component({
  selector: 'rc-channel-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, TextFieldComponent],
  templateUrl: './channel-editor.component.html',
  styleUrl: './channel-editor.component.scss',
})
export class ChannelEditorComponent {
  /** Apartment the calendar belongs to. */
  readonly apartment = input.required<Apartment>();
  /** Its connected calendar; `null` connects one. */
  readonly channel = input<Channel | null>(null);
  /** The address was stored and the calendar read, successfully or not. */
  readonly saved = output<void>();
  /** The administrator closed the window without saving. */
  readonly closed = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly address = linkedSignal(() => this.channel()?.import_url ?? '');
  protected readonly error = signal('');
  protected readonly saving = signal(false);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;
    const text = this.t().admin;
    const address = this.address().trim();
    if (!WEB_ADDRESS.test(address)) {
      this.error.set(text.channels.invalid);
      return;
    }
    this.error.set('');
    this.saving.set(true);
    try {
      const stored = await this.api.saveChannel(this.apartment().id, address);
      if (stored?.error) this.toasts.show(text.channels.savedFailed, 'error');
      else this.toasts.show(text.channels.saved);
      this.saved.emit();
    } catch {
      this.toasts.show(text.common.error, 'error');
    } finally {
      this.saving.set(false);
    }
  }
}
