import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import type { L10n } from '@models/api.model';

@Component({
  selector: 'rc-apartment-labels',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './apartment-labels.component.html',
  styleUrl: './apartment-labels.component.scss',
})
export class ApartmentLabelsComponent {
  protected readonly i18n = inject(I18nService);
  /** Bilingual labels shown as tags; nothing is rendered when empty. */
  readonly labels = input<L10n[]>([]);
}
