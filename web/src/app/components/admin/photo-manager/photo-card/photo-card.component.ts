import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { TextFieldComponent } from '@components/text-field/text-field.component';
import type { Photo } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';

@Component({
  selector: 'rc-photo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TextFieldComponent],
  templateUrl: './photo-card.component.html',
  styleUrl: './photo-card.component.scss',
})
export class PhotoCardComponent {
  /** Photo shown with its Czech description. */
  readonly photo = input.required<Photo>();
  /** The photo as stored after its description was changed. */
  readonly saved = output<Photo>();
  /** The photo was deleted on the server. */
  readonly removed = output<void>();

  protected readonly media = inject(ApiService);
  protected readonly t = inject(I18nService).t;
  protected readonly editing = signal(false);
  protected readonly altCs = signal('');
  protected readonly altEn = signal('');

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);

  protected edit(): void {
    this.altCs.set(this.photo().alt.cs);
    this.altEn.set(this.photo().alt.en);
    this.editing.set(true);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    try {
      const alt = { cs: this.altCs().trim(), en: this.altEn().trim() };
      this.saved.emit(await this.api.updatePhoto(this.photo().id, { alt }));
      this.editing.set(false);
      this.toasts.show(this.t().admin.bookings.saved);
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }

  protected async remove(): Promise<void> {
    if (!confirm(this.t().admin.photos.deleteConfirm)) return;
    try {
      await this.api.deletePhoto(this.photo().id);
      this.removed.emit();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }
}
