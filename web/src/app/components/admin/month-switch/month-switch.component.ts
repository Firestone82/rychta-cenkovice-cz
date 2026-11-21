import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { I18nService } from '@services/i18n.service';
import { addMonths, startOfMonth, todayISO } from '@utils/dates.util';

@Component({
  selector: 'rc-month-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './month-switch.component.html',
  styleUrl: './month-switch.component.scss',
})
export class MonthSwitchComponent {
  /** First day of the chosen month as an ISO date. */
  readonly month = model.required<string>();

  /** Length of one step; with `year` the buttons also read "previous year" and so on. */
  readonly unit = input<'month' | 'year'>('month');

  protected readonly t = inject(I18nService).t;
  protected readonly thisMonth = startOfMonth(todayISO());
  protected readonly labels = computed(() => {
    const t = this.t();
    return this.unit() === 'year'
      ? {
          prev: t.admin.calendar.prevYear,
          now: t.admin.calendar.thisYear,
          next: t.admin.calendar.nextYear,
        }
      : {
          prev: t.availability.prevMonth,
          now: t.availability.today,
          next: t.availability.nextMonth,
        };
  });
  /** In year steps any month of the current year counts as "now". */
  protected readonly isNow = computed(() =>
    this.unit() === 'year'
      ? this.month().slice(0, 4) === this.thisMonth.slice(0, 4)
      : this.month() === this.thisMonth,
  );

  protected move(by: number): void {
    this.month.update((m) => addMonths(m, this.unit() === 'year' ? 12 * by : by));
  }
}
