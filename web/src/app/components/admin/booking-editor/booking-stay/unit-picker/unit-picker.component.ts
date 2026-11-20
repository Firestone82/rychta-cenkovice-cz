import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { checkedOf } from '@utils/forms.util';

@Component({
  selector: 'rc-unit-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './unit-picker.component.html',
  styleUrl: './unit-picker.component.scss',
})
export class UnitPickerComponent {
  /** Apartments to choose from. */
  readonly apartments = input.required<Apartment[]>();
  /** Ids of the ticked apartments. */
  readonly selected = input.required<number[]>();
  /** Apartments held by another booking in the chosen dates: id to the holder's name. */
  readonly taken = input(new Map<number, string>());
  /** Validation message under the list. */
  readonly error = input<string | undefined>();
  /** The owner ticked (`on`) or unticked an apartment. */
  readonly toggled = output<{ id: number; on: boolean }>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly checked = checkedOf;
}
