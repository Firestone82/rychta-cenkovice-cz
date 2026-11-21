import { nightsBetween, timestamp } from '../common/dates.util.js';
import type { Booking } from './booking.entity.js';

/** Needs the booking's `units` relation loaded. */
export const presentBooking = (booking: Booking) => ({
  id: booking.id,
  code: booking.code,
  kind: booking.kind,
  status: booking.status,
  source: booking.source,
  check_in: booking.checkIn,
  check_out: booking.checkOut,
  nights: nightsBetween(booking.checkIn, booking.checkOut),
  guests: booking.guests,
  name: booking.name,
  email: booking.email,
  phone: booking.phone,
  note: booking.note,
  admin_note: booking.adminNote,
  total_price: booking.totalPrice,
  language: booking.language,
  message_id: booking.messageId,
  apartment_ids: booking.units.map((unit) => unit.apartmentId).sort((a, b) => a - b),
  created_at: timestamp(booking.createdAt),
  updated_at: timestamp(booking.updatedAt),
});

export type BookingView = ReturnType<typeof presentBooking>;
