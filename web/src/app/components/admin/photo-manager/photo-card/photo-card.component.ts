import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import type { Photo } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { ApiService } from '@services/api.service';
import { ConfirmService } from '@services/confirm.service';
import { I18nService } from '@services/i18n.service';
import { ToastService } from '@services/toast.service';

@Component({
  selector: 'rc-photo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './photo-card.component.html',
  styleUrl: './photo-card.component.scss',
})
export class PhotoCardComponent {
  /** Photo shown with its Czech description. */
  readonly photo = input.required<Photo>();
  /** The owner wants to edit the description. */
  readonly edit = output<void>();
  /** The photo was deleted on the server. */
  readonly removed = output<void>();

  protected readonly media = inject(ApiService);
  protected readonly t = inject(I18nService).t;

  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);

  protected async remove(): Promise<void> {
    const text = this.t().admin.photos;
    if (!(await this.confirm.ask(text.deleteConfirm, text.delete))) return;
    try {
      await this.api.deletePhoto(this.photo().id);
      this.removed.emit();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    }
  }
}
