import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  model,
  output,
  signal,
} from '@angular/core';
import { I18nService } from '@services/i18n.service';
import { valueOf } from '@utils/forms.util';

/** Status filter of the booking list; an empty string means every booking. */
export type BookingFilter = 'active' | 'pending' | 'confirmed' | 'cancelled' | '';

const SEARCH_DELAY_MS = 250;

@Component({
  selector: 'rc-booking-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-filters.component.html',
  styleUrl: './booking-filters.component.scss',
})
export class BookingFiltersComponent {
  /** Pressed status filter. */
  readonly filter = model.required<BookingFilter>();
  /** Trimmed search text, emitted once the owner pauses typing. */
  readonly searchChange = output<string>();

  protected readonly t = inject(I18nService).t;
  protected readonly filters = [
    { value: 'active', label: 'filterActive' },
    { value: 'pending', label: 'filterPending' },
    { value: 'confirmed', label: 'filterConfirmed' },
    { value: 'cancelled', label: 'filterCancelled' },
    { value: '', label: 'filterAll' },
  ] as const;
  protected readonly query = signal('');
  protected readonly value = valueOf;

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected type(text: string): void {
    this.query.set(text);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.searchChange.emit(text.trim()), SEARCH_DELAY_MS);
  }
}
