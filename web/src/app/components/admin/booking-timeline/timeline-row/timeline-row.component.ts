import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { nightsBetween } from '@utils/dates.util';
import type { TimelineBar, TimelineDay } from '@utils/timeline.util';
import { TimelineSelectionStore } from '../timeline-selection.store';

@Component({
  selector: 'rc-timeline-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './timeline-row.component.html',
  styleUrl: './timeline-row.component.scss',
})
export class TimelineRowComponent {
  /** Apartment this row belongs to. */
  readonly apartment = input.required<Apartment>();
  /** Bookings of this apartment as bars on the half-day grid. */
  readonly bars = input.required<TimelineBar[]>();
  /** Days of the shown month; each free day links to a new booking. */
  readonly days = input.required<TimelineDay[]>();
  /** ISO date marked as today. */
  readonly today = input.required<string>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  private readonly picking = inject(TimelineSelectionStore);

  /** The part of the stay being dragged that falls on this row, drawn like the bar it will become. */
  protected readonly picked = computed(() => {
    const pick = this.picking.selection();
    const days = this.days();
    if (pick?.apartment.id !== this.apartment().id) return null;
    const nights = nightsBetween(pick.from, pick.to);
    const start = Math.max(1, 2 * (nightsBetween(days[0].iso, pick.from) + 1) - (nights ? 0 : 1));
    const end = Math.min(2 * days.length + 1, 2 * (nightsBetween(days[0].iso, pick.to) + 1));
    if (end <= start) return null;
    return {
      column: `${start} / ${nights ? end : end + 1}`,
      day: nights === 0,
      label: nights ? this.i18n.count(nights, this.t().plural.nights) : '',
    };
  });

  protected label(b: Booking): string {
    const text = this.t().admin.bookings;
    const state = b.kind === 'block' ? text.kind.block : text.status[b.status];
    return `${this.i18n.range(b.check_in, b.check_out)}, ${state}`;
  }

  /** Starts picking days; touch is left alone, where a drag scrolls the page. */
  protected press(event: PointerEvent): void {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    if ((event.target as Element).closest('.bar-item')) return;
    this.picking.begin(this.apartment(), this.dayAt(event));
  }

  protected drag(event: PointerEvent): void {
    if (this.picking.selection()) this.picking.extend(this.dayAt(event));
  }

  private dayAt(event: PointerEvent): string {
    const days = this.days();
    const track = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const index = Math.floor(((event.clientX - track.left) / track.width) * days.length);
    return days[Math.min(days.length - 1, Math.max(0, index))].iso;
  }

  protected newLabel(iso: string): string {
    const unit = `${this.t().common.apartment} ${this.apartment().number}`;
    return `${this.t().admin.bookings.new}: ${unit}, ${this.i18n.date(iso)}`;
  }
}
