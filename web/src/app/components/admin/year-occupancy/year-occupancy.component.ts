import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { todayISO } from '@utils/dates.util';
import { labelMonths, OCCUPANCY_LEVELS, yearOccupancy } from '@utils/occupancy.util';
import { YearBoxesComponent } from './year-boxes/year-boxes.component';
import { YearRowsComponent } from './year-rows/year-rows.component';

export const YEAR_LAYOUTS = ['boxes', 'rows'] as const;
export type YearLayout = (typeof YEAR_LAYOUTS)[number];

/** Every night of a year coloured by how many apartments are taken, as month boxes or as rows. */
@Component({
  selector: 'rc-year-occupancy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [YearBoxesComponent, YearRowsComponent],
  templateUrl: './year-occupancy.component.html',
  styleUrl: './year-occupancy.component.scss',
})
export class YearOccupancyComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  /** The year shown. */
  readonly year = input.required<number>();
  /** Apartments of the house; those hidden from the website do not count. */
  readonly apartments = input.required<Apartment[]>();
  /** Bookings and blocks overlapping the year. */
  readonly bookings = input.required<Booking[]>();
  /** `boxes` draws one small calendar per month, `rows` one table row per month. */
  readonly layout = input<YearLayout>('boxes');
  /** Dims the grid while the bookings of another year are being loaded. */
  readonly loading = input(false);
  /** A month was chosen; carries its first day as an ISO date. */
  readonly month = output<string>();

  protected readonly levels = OCCUPANCY_LEVELS;
  protected readonly today = todayISO();
  protected readonly total = computed(() => this.apartments().filter((a) => a.active).length);
  protected readonly months = computed(() => {
    const ids = this.apartments()
      .filter((a) => a.active)
      .map((a) => a.id);
    const text = this.t().admin.calendar.taken;
    return labelMonths(
      yearOccupancy(this.year(), ids, this.bookings(), this.i18n.locale()),
      (day) =>
        `${this.i18n.date(day.iso, 'weekday')}: ${this.i18n.fill(text, { n: day.taken, total: ids.length })}`,
    );
  });
}
