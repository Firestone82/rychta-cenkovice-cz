import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Api } from '../core/api';
import { addDays, addMonths, startOfMonth, todayISO } from '../core/dates';
import { I18n } from '../core/i18n/i18n';
import type { Apartment, OccupiedRange } from '../core/models';
import { Icon } from '../ui/icon';
import { Occupancy } from '../ui/occupancy';

/** Occupancy tables for one or more months, with buttons to move through the calendar. */
@Component({
  selector: 'rc-occupancy-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Occupancy, Icon],
  template: `
    <div class="bar">
      <button
        type="button"
        class="btn btn-quiet btn-small"
        (click)="move(-1)"
        [disabled]="!canGoBack()"
      >
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
      <button
        type="button"
        class="btn btn-quiet btn-small"
        (click)="move(1)"
        [disabled]="!canGoForward()"
      >
        {{ t().availability.nextMonth }} <rc-icon name="right" />
      </button>
    </div>

    @if (failed()) {
      <p class="notice is-error" role="alert">{{ t().common.loadFailed }}</p>
    }

    <div class="months" [class.is-loading]="loading()" [attr.aria-busy]="loading()">
      @for (m of shown(); track m) {
        <section>
          <p class="h3" role="heading" [attr.aria-level]="level()">{{ i18n.date(m, 'month') }}</p>
          <rc-occupancy
            [apartments]="apartments()"
            [ranges]="ranges()"
            [month]="m"
            [today]="today"
            [linked]="linked()"
            [selection]="selection()"
          />
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
    }
    .months {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 40px;
      transition: opacity 0.2s;
    }
    .months.is-loading {
      opacity: 0.55;
    }
    .h3 {
      margin-bottom: 12px;
      text-transform: capitalize;
    }
    .notice {
      margin-bottom: 20px;
    }
  `,
})
export class OccupancyPager {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);

  readonly apartments = input.required<Apartment[]>();
  /** How many months are shown at once. */
  readonly months = input(2);
  readonly linked = input(true);
  /** Heading level of the month names, so they fit the outline of the page around. */
  readonly level = input(3);
  readonly selection = input<{ from: string; to: string } | null>(null);

  protected readonly today = todayISO();
  protected readonly thisMonth = startOfMonth(this.today);
  protected readonly month = signal(this.thisMonth);
  protected readonly ranges = signal<OccupiedRange[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly shown = computed(() =>
    Array.from({ length: this.months() }, (_, i) => addMonths(this.month(), i)),
  );
  protected readonly canGoBack = computed(() => this.month() > this.thisMonth);
  protected readonly canGoForward = computed(() => this.month() < addMonths(this.thisMonth, 23));

  constructor() {
    effect(() => {
      const from = this.month();
      const to = addDays(addMonths(from, this.months()), 1);
      this.loading.set(true);
      this.api.occupancy(addDays(from, -1), to).then(
        (ranges) => {
          if (this.month() !== from) return;
          this.ranges.set(ranges);
          this.failed.set(false);
          this.loading.set(false);
        },
        () => {
          if (this.month() !== from) return;
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
