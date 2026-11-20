import type { Apartment, Booking } from '@models/api.model';

/** "1, 3, 4": the apartment numbers of a booking. */
export function unitNumbers(
  booking: Pick<Booking, 'apartment_ids'>,
  apartments: Apartment[],
): string {
  return booking.apartment_ids
    .map((id) => apartments.find((a) => a.id === id)?.number ?? id)
    .sort((a, b) => a - b)
    .join(', ');
}

export function statusClass(booking: Pick<Booking, 'status' | 'kind'>): string {
  if (booking.kind === 'block' && booking.status !== 'cancelled') return 'tag-block';
  return `tag-${booking.status}`;
}
