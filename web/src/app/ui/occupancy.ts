import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addDays, daysInMonth, weekday } from '../core/dates';
import { I18n } from '../core/i18n/i18n';
import { Links } from '../core/links';
import type { Apartment, OccupiedRange } from '../core/models';

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
  template: `
    <div class="scroll" tabindex="0" role="region" [attr.aria-label]="caption()">
      <table>
        <caption class="sr-only">
          {{
            caption()
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" class="corner">
              <span class="sr-only">{{ t().common.apartment }}</span>
            </th>
            @for (d of days(); track d.iso) {
              <th scope="col" [class.weekend]="d.weekend" [class.today]="d.iso === today()">
                <span class="dow" aria-hidden="true">{{ d.dow }}</span>
                <span class="dom">{{ d.day }}</span>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.apartment.id) {
            <tr>
              <th scope="row">
                @if (linked()) {
                  <a [routerLink]="links.apartment(row.apartment.number)"
                    >{{ t().common.apartment }} {{ row.apartment.number }}</a
                  >
                } @else {
                  {{ t().common.apartment }} {{ row.apartment.number }}
                }
                <span class="beds">{{ i18n.count(row.apartment.beds, t().plural.beds) }}</span>
              </th>
              @for (c of row.cells; track c.iso) {
                <td
                  [attr.data-am]="c.am"
                  [attr.data-pm]="c.pm"
                  [class.past]="c.past"
                  [class.selected]="c.selected"
                >
                  <span class="sr-only">{{ c.label }}</span>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    <ul class="legend" aria-hidden="true">
      <li><i data-k="free"></i>{{ t().availability.free }}</li>
      <li><i data-k="booked"></i>{{ t().availability.booked }}</li>
      <li><i data-k="pending"></i>{{ t().availability.pending }}</li>
    </ul>
  `,
  styles: `
    :host {
      display: block;
      --free: #dcebdd;
      --booked: var(--timber);
      --pending: var(--larch);
    }
    .scroll {
      position: relative; /* keeps the visually hidden cell labels inside the scroller */
      overflow-x: auto;
      border: 1px solid var(--line);
      background: var(--white);
    }
    table {
      border-collapse: separate;
      border-spacing: 0;
      width: 100%;
      min-width: 860px;
      font-size: 0.9rem;
    }
    th,
    td {
      padding: 0;
      text-align: center;
    }
    thead th {
      padding: 8px 0 6px;
      font-weight: 500;
      color: var(--slate-2);
      border-bottom: 1px solid var(--line);
      line-height: 1.15;
    }
    .dow {
      display: block;
      font-size: 0.72rem;
      text-transform: lowercase;
    }
    .dom {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.2rem;
      color: var(--slate);
    }
    th.weekend .dom {
      color: var(--timber);
    }
    th.today {
      box-shadow: inset 0 -3px 0 var(--slate);
    }
    tbody th,
    .corner {
      position: sticky;
      left: 0;
      z-index: 1;
      background: var(--white);
      text-align: left;
      white-space: nowrap;
      padding: 0 14px;
      border-right: 1px solid var(--line);
      font-weight: 700;
    }
    tbody th a {
      text-underline-offset: 3px;
    }
    .beds {
      display: block;
      font-weight: 400;
      font-size: 0.8rem;
      color: var(--slate-2);
    }
    tbody tr + tr th,
    tbody tr + tr td {
      border-top: 3px solid var(--white);
    }
    td {
      height: 46px;
      min-width: 26px;
      border-left: 1px solid var(--white);
      --am: var(--free);
      --pm: var(--free);
      background: linear-gradient(135deg, var(--am) 50%, var(--pm) 50%);
    }
    td[data-am='booked'] {
      --am: var(--booked);
    }
    td[data-pm='booked'] {
      --pm: var(--booked);
    }
    td[data-am='pending'] {
      --am: var(--pending);
    }
    td[data-pm='pending'] {
      --pm: var(--pending);
    }
    td.past {
      opacity: 0.35;
    }
    td.selected {
      box-shadow:
        inset 0 4px 0 var(--slate),
        inset 0 -4px 0 var(--slate);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 24px;
      margin-top: 14px;
      font-size: 0.92rem;
      color: var(--slate-2);
    }
    .legend li {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .legend i {
      width: 18px;
      height: 18px;
      background: var(--free);
    }
    .legend i[data-k='booked'] {
      background: var(--booked);
    }
    .legend i[data-k='pending'] {
      background: var(--pending);
    }
  `,
})
export class Occupancy {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;

  readonly apartments = input.required<Apartment[]>();
  readonly ranges = input.required<OccupiedRange[]>();
  /** First day of the shown month (YYYY-MM-01). */
  readonly month = input.required<string>();
  readonly today = input.required<string>();
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
