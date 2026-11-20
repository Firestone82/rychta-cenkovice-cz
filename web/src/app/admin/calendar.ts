import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import {
  addDays,
  addMonths,
  daysInMonth,
  nightsBetween,
  startOfMonth,
  todayISO,
  weekday,
} from '../core/dates';
import { I18n } from '../core/i18n/i18n';
import type { Apartment, Booking } from '../core/models';
import { Seo } from '../core/seo';
import { Icon } from '../ui/icon';
import { Spinner } from '../ui/spinner';

interface Bar {
  booking: Booking;
  /** CSS grid lines in half-day columns. */
  start: number;
  end: number;
  label: string;
}

/**
 * A month as a timeline: one row per apartment, bookings as bars from the afternoon of
 * arrival to the morning of departure. Bars open the booking, free days start a new one.
 */
@Component({
  selector: 'rc-admin-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner],
  template: `
    <div class="a-head">
      <div>
        <h1>{{ t().admin.calendar.title }}</h1>
        <p>{{ t().admin.calendar.hint }}</p>
      </div>
      <div class="a-actions">
        <a class="btn" routerLink="/admin/bookings/new"
          ><rc-icon name="plus" /> {{ t().admin.bookings.new }}</a
        >
      </div>
    </div>

    <div class="bar">
      <button type="button" class="btn btn-quiet btn-small" (click)="move(-1)">
        <rc-icon name="left" /> {{ t().availability.prevMonth }}
      </button>
      <button
        type="button"
        class="btn btn-quiet btn-small"
        (click)="month.set(thisMonth)"
        [disabled]="month() === thisMonth"
      >
        {{ t().availability.today }}
      </button>
      <button type="button" class="btn btn-quiet btn-small" (click)="move(1)">
        {{ t().availability.nextMonth }} <rc-icon name="right" />
      </button>
      <h2 class="month" aria-live="polite">{{ i18n.date(month(), 'month') }}</h2>
    </div>

    @if (apartments().length) {
      <div
        class="scroll"
        tabindex="0"
        role="region"
        [attr.aria-label]="t().admin.calendar.title"
        [class.is-loading]="loading()"
      >
        <div class="cal" [style.--days]="days().length">
          <div class="row head">
            <div class="name"></div>
            <div class="track">
              @for (d of days(); track d.iso; let i = $index) {
                <div
                  class="day"
                  [style.grid-column]="2 * i + 1 + ' / span 2'"
                  [class.weekend]="d.weekend"
                  [class.today]="d.iso === today"
                >
                  <span aria-hidden="true">{{ d.dow }}</span>
                  <strong>{{ d.day }}</strong>
                </div>
              }
            </div>
          </div>
          @for (row of rows(); track row.apartment.id) {
            <div class="row">
              <div class="name">
                <span class="num">{{ row.apartment.number }}</span>
                <span>{{ i18n.count(row.apartment.beds, t().plural.beds) }}</span>
              </div>
              <div class="track">
                @for (d of days(); track d.iso; let i = $index) {
                  <a
                    class="cell"
                    [style.grid-column]="2 * i + 1 + ' / span 2'"
                    [class.weekend]="d.weekend"
                    [class.today]="d.iso === today"
                    routerLink="/admin/bookings/new"
                    [queryParams]="{ from: d.iso, a: row.apartment.number }"
                    [attr.aria-label]="
                      t().admin.bookings.new +
                      ': ' +
                      t().common.apartment +
                      ' ' +
                      row.apartment.number +
                      ', ' +
                      i18n.date(d.iso)
                    "
                  ></a>
                }
                @for (bar of row.bars; track bar.booking.id) {
                  <a
                    class="bar-item"
                    [attr.data-status]="bar.booking.kind === 'block' ? 'block' : bar.booking.status"
                    [style.grid-column]="bar.start + ' / ' + bar.end"
                    [routerLink]="['/admin/bookings', bar.booking.id]"
                    [title]="bar.label"
                  >
                    <span>{{ bar.booking.name || t().admin.bookings.kind.block }}</span>
                    <span class="sr-only">, {{ bar.label }}</span>
                  </a>
                }
              </div>
            </div>
          }
        </div>
      </div>
      <ul class="legend">
        <li><i data-status="confirmed"></i>{{ t().admin.bookings.status.confirmed }}</li>
        <li><i data-status="pending"></i>{{ t().admin.bookings.status.pending }}</li>
        <li><i data-status="block"></i>{{ t().admin.bookings.kind.block }}</li>
      </ul>
    } @else if (failed()) {
      <p class="notice is-error" role="alert">{{ t().common.loadFailed }}</p>
    } @else {
      <rc-spinner [label]="t().common.loading" />
    }
  `,
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
    }
    .month {
      margin-left: 10px;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 2rem;
      line-height: 1;
      text-transform: capitalize;
    }
    .scroll {
      position: relative;
      overflow-x: auto;
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      transition: opacity 0.2s;
    }
    .scroll.is-loading {
      opacity: 0.6;
    }
    .cal {
      min-width: 980px;
    }
    .row {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      border-bottom: 1px solid var(--line);
    }
    .row:last-child {
      border-bottom: 0;
    }
    .name {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
      font-size: 0.85rem;
      color: var(--slate-2);
      border-right: 1px solid var(--line);
      position: sticky;
      left: 0;
      z-index: 3;
      background: var(--white);
    }
    .name .num {
      font-size: 2rem;
      line-height: 1;
      color: var(--timber);
    }
    .track {
      position: relative;
      display: grid;
      grid-template-columns: repeat(calc(var(--days) * 2), minmax(0, 1fr));
      grid-auto-rows: 52px;
    }
    .head .track {
      grid-auto-rows: 44px;
    }
    .day {
      display: grid;
      place-content: center;
      justify-items: center;
      font-size: 0.78rem;
      line-height: 1.15;
      color: var(--slate-2);
      border-right: 1px solid var(--line);
    }
    .day strong {
      font-size: 0.95rem;
      color: var(--slate);
    }
    .day.weekend,
    .cell.weekend {
      background: var(--snow);
    }
    .day.today {
      box-shadow: inset 0 -4px 0 var(--timber);
    }
    .cell {
      grid-row: 1;
      border-right: 1px solid var(--line);
    }
    .cell:hover {
      background: var(--spruce-soft);
    }
    .cell.today {
      box-shadow: inset 2px 0 0 var(--timber);
    }
    .cell:focus-visible {
      outline-offset: -3px;
    }
    .bar-item {
      grid-row: 1;
      z-index: 2;
      align-self: center;
      height: 34px;
      margin-inline: 2px;
      padding: 0 8px;
      display: flex;
      align-items: center;
      border-radius: 3px;
      background: var(--timber);
      color: var(--white);
      font-size: 0.88rem;
      font-weight: 700;
      text-decoration: none;
      overflow: hidden;
      /* slanted ends: arrival in the afternoon, departure in the morning */
      clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
    }
    .bar-item span:first-child {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      padding-left: 6px;
    }
    .bar-item[data-status='pending'] {
      background: var(--larch);
      color: var(--slate);
    }
    .bar-item[data-status='block'] {
      background: var(--slate);
    }
    .bar-item:hover {
      filter: brightness(1.12);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 22px;
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
      width: 22px;
      height: 14px;
      background: var(--timber);
    }
    .legend i[data-status='pending'] {
      background: var(--larch);
    }
    .legend i[data-status='block'] {
      background: var(--slate);
    }
  `,
})
export class CalendarPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);

  protected readonly today = todayISO();
  protected readonly thisMonth = startOfMonth(this.today);
  protected readonly month = signal(this.thisMonth);
  protected readonly apartments = signal<Apartment[]>([]);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly days = computed(() => {
    const first = this.month();
    const fmt = new Intl.DateTimeFormat(this.i18n.locale(), { weekday: 'narrow', timeZone: 'UTC' });
    return Array.from({ length: daysInMonth(first) }, (_, i) => {
      const iso = addDays(first, i);
      return {
        iso,
        day: i + 1,
        weekend: weekday(iso) >= 5,
        dow: fmt.format(new Date(iso + 'T00:00:00Z')),
      };
    });
  });

  protected readonly rows = computed(() => {
    const first = this.month();
    const count = this.days().length;
    return this.apartments().map((apartment) => {
      const bars: Bar[] = this.bookings()
        .filter((b) => b.apartment_ids.includes(apartment.id))
        .map((b) => {
          const inDay = nightsBetween(first, b.check_in) + 1; // 1-based day of month, may be < 1
          const outDay = nightsBetween(first, b.check_out) + 1;
          return {
            booking: b,
            start: Math.max(1, 2 * inDay),
            end: Math.min(2 * count + 1, 2 * outDay),
            label: `${this.i18n.range(b.check_in, b.check_out)}, ${b.kind === 'block' ? this.t().admin.bookings.kind.block : this.t().admin.bookings.status[b.status]}`,
          };
        })
        .filter((bar) => bar.end > bar.start);
      return { apartment, bars };
    });
  });

  constructor() {
    inject(Seo).noIndex(this.t().admin.calendar.title);
    this.api.adminApartments().then(
      (list) => this.apartments.set(list),
      () => this.failed.set(true),
    );
    effect(() => {
      const from = this.month();
      this.loading.set(true);
      this.api
        .adminBookings({
          status: 'active',
          from: addDays(from, -1),
          to: addDays(addMonths(from, 1), 1),
        })
        .then(
          (list) => {
            if (this.month() !== from) return;
            this.bookings.set(list);
            this.loading.set(false);
          },
          () => {
            this.failed.set(true);
            this.loading.set(false);
          },
        );
    });
  }

  protected move(by: number): void {
    this.month.update((m) => addMonths(m, by));
  }
}
