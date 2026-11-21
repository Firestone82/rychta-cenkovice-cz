import type { Booking, Photo } from '@models/api.model';
import { nightsBetween } from '@utils/dates.util';
import type { DemoData } from './demo-data';

/** A request as the fake API sees it: the path below the API base and its query and body. */
export interface DemoRequest {
  method: string;
  path: string;
  query: (name: string) => string;
  body: unknown;
}

/** An answer with a status other than 2xx, shaped like the API's error body. */
export class DemoFailure {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly extra: Record<string, unknown> = {},
  ) {}

  get body(): unknown {
    const { fields, ...rest } = this.extra;
    return {
      error: { code: this.code, message: this.code, ...(fields ? { fields } : {}) },
      ...rest,
    };
  }
}

export const notFound = () => new DemoFailure(404, 'not_found');
export const invalid = (fields: Record<string, string>) =>
  new DemoFailure(422, 'validation', { fields });

const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** The data of the fake API, changed in memory; a reload of the page starts over. */
export class DemoStore {
  constructor(readonly data: DemoData) {}

  nextId(items: { id: number }[]): number {
    return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  bookingCode(): string {
    const letters = Array.from({ length: 6 }, () =>
      CODE_LETTERS.charAt(Math.floor(Math.random() * CODE_LETTERS.length)),
    );
    return `RC-${letters.join('')}`;
  }

  booking(id: number): Booking {
    const booking = this.data.bookings.find((b) => b.id === id);
    if (!booking) throw notFound();
    return booking;
  }

  /** Bookings that hold days in `[from, to)`, as the API counts them. */
  holding(from: string, to: string, exceptId = 0): Booking[] {
    return this.data.bookings.filter(
      (b) => b.id !== exceptId && b.status !== 'cancelled' && b.check_in < to && b.check_out > from,
    );
  }

  /** Apartments of `ids` taken in `[from, to)`. */
  taken(ids: number[], from: string, to: string, exceptId = 0): number[] {
    const busy = new Set(this.holding(from, to, exceptId).flatMap((b) => b.apartment_ids));
    return ids.filter((id) => busy.has(id));
  }

  /** Nightly prices times the nights; null when any apartment has no price. */
  price(ids: number[], checkIn: string, checkOut: string): number | null {
    const nights = nightsBetween(checkIn, checkOut);
    const prices = ids.map(
      (id) => this.data.apartments.find((a) => a.id === id)?.price_per_night ?? null,
    );
    if (nights <= 0 || prices.some((p) => p === null)) return null;
    return prices.reduce<number>((sum, p) => sum + (p ?? 0) * nights, 0);
  }

  /** Visible photos in gallery order. */
  photos(filter: (photo: Photo) => boolean = () => true): Photo[] {
    return this.data.photos
      .filter((photo) => photo.file && filter(photo))
      .sort((a, b) => a.sort - b.sort || a.id - b.id);
  }
}

/** Current time as the API writes it. */
export const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
