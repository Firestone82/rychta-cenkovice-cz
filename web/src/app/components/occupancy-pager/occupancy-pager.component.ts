import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ApiService } from '@services/api.service';
import { addDays, addMonths, startOfMonth, todayISO } from '@utils/dates.util';
import { I18nService } from '@services/i18n.service';
import type { Apartment, OccupiedRange } from '@models/api.model';
import { IconComponent } from '@components/icon/icon.component';
import { OccupancyComponent } from '@components/occupancy/occupancy.component';

@Component({
  selector: 'rc-occupancy-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OccupancyComponent, IconComponent],
  templateUrl: './occupancy-pager.component.html',
  styleUrl: './occupancy-pager.component.scss',
})
export class OccupancyPagerComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  private readonly api = inject(ApiService);

  /** Apartments shown as rows of the calendar. */
  readonly apartments = input.required<Apartment[]>();
  /** How many months are shown at once. */
  readonly months = input(2);
  /** Apartment names link to their detail pages. */
  readonly linked = input(true);
  /** Heading level of the month names, so they fit the outline of the page around. */
  readonly level = input(3);
  /** Stay to highlight, e.g. the dates chosen in the booking form. */
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
