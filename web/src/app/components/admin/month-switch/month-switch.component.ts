import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
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

  protected readonly t = inject(I18nService).t;
  protected readonly thisMonth = startOfMonth(todayISO());

  protected move(by: number): void {
    this.month.update((m) => addMonths(m, by));
  }
}
