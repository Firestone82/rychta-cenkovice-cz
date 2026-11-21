import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import { weekday } from '@utils/dates.util';
import type { LabelledMonth } from '@utils/occupancy.util';

/** The year as twelve small calendars, weeks from Monday, each night coloured by its occupancy. */
@Component({
  selector: 'rc-year-boxes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './year-boxes.component.html',
  styleUrl: './year-boxes.component.scss',
})
export class YearBoxesComponent {
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  /** The twelve months with the occupancy of every night. */
  readonly months = input.required<LabelledMonth[]>();
  /** Today's ISO date; its cell is outlined. */
  readonly today = input.required<string>();
  /** Dims the calendars while another year is being loaded. */
  readonly loading = input(false);
  /** A month was chosen; carries its first day as an ISO date. */
  readonly month = output<string>();

  /** Two-letter weekday names from Monday; 1 January 2024 was a Monday. */
  protected readonly weekdays = computed(() => {
    const names = new Intl.DateTimeFormat(this.i18n.locale(), {
      weekday: 'short',
      timeZone: 'UTC',
    });
    return Array.from({ length: 7 }, (_, i) => names.format(new Date(Date.UTC(2024, 0, 1 + i))));
  });

  /** Grid column of the first day of a month. */
  protected offset(first: string): number {
    return weekday(first) + 1;
  }
}
