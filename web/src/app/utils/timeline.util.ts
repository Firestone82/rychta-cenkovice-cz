import type { Booking } from '@models/api.model';
import { addDays, daysInMonth, nightsBetween, weekday } from './dates.util';

export interface TimelineDay {
  iso: string;
  day: number;
  weekend: boolean;
  /** Narrow weekday name in the given locale. */
  dow: string;
}

export interface TimelineBar {
  booking: Booking;
  /** CSS grid lines in half-day columns: a stay runs from the afternoon to the morning. */
  start: number;
  end: number;
}

export function monthDays(firstOfMonth: string, locale: string): TimelineDay[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
  return Array.from({ length: daysInMonth(firstOfMonth) }, (_, i) => {
    const iso = addDays(firstOfMonth, i);
    return {
      iso,
      day: i + 1,
      weekend: weekday(iso) >= 5,
      dow: fmt.format(new Date(iso + 'T00:00:00Z')),
    };
  });
}

/** Bars of one apartment within the month; stays reaching outside are clipped to its edges. */
export function monthBars(
  bookings: Booking[],
  apartmentId: number,
  firstOfMonth: string,
): TimelineBar[] {
  const count = daysInMonth(firstOfMonth);
  return bookings
    .filter((b) => b.apartment_ids.includes(apartmentId))
    .map((booking) => ({
      booking,
      start: Math.max(1, 2 * (nightsBetween(firstOfMonth, booking.check_in) + 1)),
      end: Math.min(2 * count + 1, 2 * (nightsBetween(firstOfMonth, booking.check_out) + 1)),
    }))
    .filter((bar) => bar.end > bar.start);
}
