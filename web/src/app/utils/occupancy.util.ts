import type { Booking } from '@models/api.model';
import { addDays, addMonths, daysInMonth, weekday } from './dates.util';

/** How full the house is on one night. */
export type OccupancyLevel = 'free' | 'some' | 'half' | 'full';
export const OCCUPANCY_LEVELS: readonly OccupancyLevel[] = ['free', 'some', 'half', 'full'];

export interface OccupancyDay {
  iso: string;
  day: number;
  weekend: boolean;
  /** Apartments taken on the night that starts this day. */
  taken: number;
  level: OccupancyLevel;
}

export interface OccupancyMonth {
  /** First day of the month. */
  first: string;
  /** Month name in the given locale. */
  name: string;
  days: OccupancyDay[];
  /** Taken apartment nights of the month as a share of all of them, 0 to 1. */
  share: number;
}

export function occupancyLevel(taken: number, total: number): OccupancyLevel {
  if (!taken || !total) return 'free';
  if (taken >= total) return 'full';
  return taken * 2 >= total ? 'half' : 'some';
}

/**
 * Occupancy of every night of a year over the given apartments. A stay takes the nights
 * from its arrival up to the one before its departure.
 */
export function yearOccupancy(
  year: number,
  apartmentIds: readonly number[],
  bookings: readonly Booking[],
  locale: string,
): OccupancyMonth[] {
  const counted = new Set(apartmentIds);
  const taken = new Map<string, Set<number>>();
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  for (const booking of bookings) {
    const ids = booking.apartment_ids.filter((id) => counted.has(id));
    if (!ids.length) continue;
    const last = booking.check_out < end ? booking.check_out : end;
    for (let iso = booking.check_in > start ? booking.check_in : start; iso < last;) {
      let night = taken.get(iso);
      if (!night) taken.set(iso, (night = new Set()));
      for (const id of ids) night.add(id);
      iso = addDays(iso, 1);
    }
  }

  const names = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, m) => {
    const first = addMonths(start, m);
    const days = Array.from({ length: daysInMonth(first) }, (_, d): OccupancyDay => {
      const iso = addDays(first, d);
      const count = taken.get(iso)?.size ?? 0;
      return {
        iso,
        day: d + 1,
        weekend: weekday(iso) >= 5,
        taken: count,
        level: occupancyLevel(count, counted.size),
      };
    });
    const nights = days.reduce((sum, day) => sum + day.taken, 0);
    return {
      first,
      name: names.format(new Date(first + 'T00:00:00Z')),
      days,
      share: counted.size ? nights / (days.length * counted.size) : 0,
    };
  });
}

export interface LabelledDay extends OccupancyDay {
  /** Sentence for the tooltip, e.g. "Sat 13/03: 4 of 6 apartments taken". */
  title: string;
}

export interface LabelledMonth extends Omit<OccupancyMonth, 'days'> {
  days: LabelledDay[];
  /** `share` as a rounded percentage with its sign. */
  percent: string;
}

/** Adds the texts both layouts of the year view show. */
export function labelMonths(
  months: OccupancyMonth[],
  title: (day: OccupancyDay) => string,
): LabelledMonth[] {
  return months.map((month) => ({
    ...month,
    percent: `${Math.round(month.share * 100)} %`,
    days: month.days.map((day) => ({ ...day, title: title(day) })),
  }));
}
