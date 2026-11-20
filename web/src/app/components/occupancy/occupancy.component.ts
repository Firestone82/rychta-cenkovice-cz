import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addDays, daysInMonth, weekday } from '@utils/dates.util';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import type { Apartment, OccupiedRange } from '@models/api.model';

type Half = 'free' | 'booked' | 'pending';

interface Cell {
  iso: string;
  am: Half;
  pm: Half;
  past: boolean;
  selected: boolean;
  label: string;
}

/**
 * One month of occupancy: a row per apartment, a column per day. Each day is split
 * diagonally into morning and evening, so arrival and departure days read correctly
 * (a departure day is free for the next arrival).
 */
@Component({
  selector: 'rc-occupancy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './occupancy.component.html',
  styleUrl: './occupancy.component.scss',
})
export class OccupancyComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;

  /** Apartments shown as rows. */
  readonly apartments = input.required<Apartment[]>();
  /** Occupied date ranges per apartment. */
  readonly ranges = input.required<OccupiedRange[]>();
  /** First day of the shown month (YYYY-MM-01). */
  readonly month = input.required<string>();
  /** ISO date marked as today; earlier days are shown as past. */
  readonly today = input.required<string>();
  /** Apartment names link to their detail pages. */
  readonly linked = input(true);
  /** Optional stay to highlight (the visitor's selected dates). */
  readonly selection = input<{ from: string; to: string } | null>(null);

  protected readonly caption = computed(() =>
    this.i18n.fill(this.t().availability.tableCaption, {
      month: this.i18n.date(this.month(), 'month'),
    }),
  );

  protected readonly days = computed(() => {
    const first = this.month();
    const fmt = new Intl.DateTimeFormat(this.i18n.locale(), { weekday: 'narrow', timeZone: 'UTC' });
    return Array.from({ length: daysInMonth(first) }, (_, i) => {
      const iso = addDays(first, i);
      const wd = weekday(iso);
      return { iso, day: i + 1, weekend: wd >= 5, dow: fmt.format(new Date(iso + 'T00:00:00Z')) };
    });
  });

  protected readonly rows = computed(() => {
    const t = this.t().availability;
    const today = this.today();
    const sel = this.selection();
    const byApartment = new Map<number, OccupiedRange[]>();
    for (const r of this.ranges()) {
      const list = byApartment.get(r.apartment_id) ?? [];
      list.push(r);
      byApartment.set(r.apartment_id, list);
    }
    const label = (h: Half) =>
      h === 'booked' ? t.cellBooked : h === 'pending' ? t.cellPending : t.cellFree;
    return this.apartments().map((apartment) => {
      const ranges = byApartment.get(apartment.id) ?? [];
      const cells: Cell[] = this.days().map(({ iso }) => {
        let am: Half = 'free';
        let pm: Half = 'free';
        for (const r of ranges) {
          if (r.from < iso && iso <= r.to) am = r.status;
          if (r.from <= iso && iso < r.to) pm = r.status;
        }
        const dayLabel = this.i18n.date(iso, 'weekday');
        return {
          iso,
          am,
          pm,
          past: iso < today,
          selected: !!sel && sel.from <= iso && iso < sel.to,
          label: `${dayLabel}: ${am === pm ? label(pm) : `${label(am)} / ${label(pm)}`}`,
        };
      });
      return { apartment, cells };
    });
  });
}
