import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { checkedOf } from '@utils/forms.util';

@Component({
  selector: 'rc-unit-option',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './unit-option.component.html',
  styleUrl: './unit-option.component.scss',
})
export class UnitOptionComponent {
  /** Apartment offered by this option. */
  readonly apartment = input.required<Apartment>();
  /** Whether the apartment is part of the booking. */
  readonly selected = input(false);
  /** Taken in the chosen dates; null while the dates are not known or not checked yet. */
  readonly taken = input<boolean | null>(null);
  /** The visitor ticked or unticked the apartment. */
  readonly selectedChange = output<boolean>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly checked = checkedOf;
}
