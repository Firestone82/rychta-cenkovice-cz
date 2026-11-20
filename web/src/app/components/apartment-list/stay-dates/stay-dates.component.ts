import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import { addDays, isISO, todayISO } from '@utils/dates.util';
import { valueOf } from '@utils/forms.util';

@Component({
  selector: 'rc-stay-dates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stay-dates.component.html',
  styleUrl: './stay-dates.component.scss',
})
export class StayDatesComponent {
  /** Arrival as an ISO date, empty when not chosen. */
  readonly from = input.required<string>();
  /** Departure as an ISO date, empty when not chosen. */
  readonly to = input.required<string>();
  /** Line under the fields: the availability summary or a problem with the dates. */
  readonly message = input('');
  /** Shows `message` as an error. */
  readonly error = input(false);
  /** The visitor picked another arrival; empty string when cleared. */
  readonly fromChange = output<string>();
  /** The visitor picked another departure; empty string when cleared. */
  readonly toChange = output<string>();

  protected readonly t = inject(I18nService).t;
  protected readonly today = todayISO();
  protected readonly value = valueOf;
  protected readonly minTo = computed(() =>
    addDays(isISO(this.from()) ? this.from() : this.today, 1),
  );

  protected clear(): void {
    this.fromChange.emit('');
    this.toChange.emit('');
  }
}
