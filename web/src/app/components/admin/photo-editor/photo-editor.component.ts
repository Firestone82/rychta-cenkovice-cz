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
import type { Photo } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';

/** A window for the Czech and English description of one photo. */
@Component({
  selector: 'rc-photo-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, TextFieldComponent],
  templateUrl: './photo-editor.component.html',
  styleUrl: './photo-editor.component.scss',
})
export class PhotoEditorComponent {
  /** Photo whose description is edited. */
  readonly photo = input.required<Photo>();
  /** The photo as stored after the description was saved. */
  readonly saved = output<Photo>();
  /** The owner closed the window without saving. */
  readonly closed = output<void>();

  protected readonly media = inject(ApiService);
  protected readonly t = inject(I18nService).t;
  protected readonly altCs = linkedSignal(() => this.photo().alt.cs);
  protected readonly altEn = linkedSignal(() => this.photo().alt.en);
  protected readonly saving = signal(false);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.saving.set(true);
    try {
      const alt = { cs: this.altCs().trim(), en: this.altEn().trim() };
      this.saved.emit(await this.api.updatePhoto(this.photo().id, { alt }));
      this.toasts.show(this.t().admin.bookings.saved);
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    } finally {
      this.saving.set(false);
    }
  }
}
