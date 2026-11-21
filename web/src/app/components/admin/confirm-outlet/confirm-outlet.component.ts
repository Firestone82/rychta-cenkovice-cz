import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModalComponent } from '@components/admin/modal/modal.component';
import { ConfirmService } from '@services/confirm.service';
import { I18nService } from '@services/i18n.service';

/** Shows the question asked through `ConfirmService`; placed once in the admin layout. */
@Component({
  selector: 'rc-confirm-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  templateUrl: './confirm-outlet.component.html',
  styleUrl: './confirm-outlet.component.scss',
})
export class ConfirmOutletComponent {
  protected readonly confirm = inject(ConfirmService);
  protected readonly t = inject(I18nService).t;
}
