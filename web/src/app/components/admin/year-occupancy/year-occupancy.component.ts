import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { todayISO } from '@utils/dates.util';
import { OCCUPANCY_LEVELS, type OccupancyDay, yearOccupancy } from '@utils/occupancy.util';

/** One row per month and one cell per night, coloured by how many apartments are taken. */
@Component({
  selector: 'rc-year-occupancy',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  /** Dims the grid while the bookings of another year are being loaded. */
  readonly loading = input(false);
  /** A month was chosen; carries its first day as an ISO date. */
  readonly month = output<string>();

  protected readonly levels = OCCUPANCY_LEVELS;
  protected readonly today = todayISO();
  protected readonly dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);
  protected readonly total = computed(() => this.apartments().filter((a) => a.active).length);
  protected readonly months = computed(() =>
    yearOccupancy(
      this.year(),
      this.apartments()
        .filter((a) => a.active)
        .map((a) => a.id),
      this.bookings(),
      this.i18n.locale(),
    ),
  );

  protected describe(day: OccupancyDay): string {
    const text = this.t().admin.calendar;
    return `${this.i18n.date(day.iso, 'weekday')}: ${this.i18n.fill(text.taken, {
      n: day.taken,
      total: this.total(),
    })}`;
  }

  protected percent(share: number): string {
    return `${Math.round(share * 100)} %`;
  }
}
