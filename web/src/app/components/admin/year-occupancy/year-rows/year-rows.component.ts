import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import type { LabelledMonth } from '@utils/occupancy.util';

/** The year as a table: one row per month, one cell per night with the number of taken apartments. */
@Component({
  selector: 'rc-year-rows',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './year-rows.component.html',
  styleUrl: './year-rows.component.scss',
})
export class YearRowsComponent {
  protected readonly t = inject(I18nService).t;

  /** The year shown, for the caption. */
  readonly year = input.required<number>();
  /** The twelve months with the occupancy of every night. */
  readonly months = input.required<LabelledMonth[]>();
  /** Today's ISO date; its cell is outlined. */
  readonly today = input.required<string>();
  /** Dims the table while another year is being loaded. */
  readonly loading = input(false);
  /** A month was chosen; carries its first day as an ISO date. */
  readonly month = output<string>();

  protected readonly dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);
}
