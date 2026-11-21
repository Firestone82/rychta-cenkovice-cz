import { z } from 'zod';
import { email, language, PHONE, text } from '../common/schemas.js';

/** A stay is checked against the apartments and the calendar in `StayService`, not here. */
export const bookingRequestSchema = z.object({
  apartment_ids: z.array(z.int('unknown'), 'required').default([]),
  check_in: z.string('invalid').default(''),
  check_out: z.string('invalid').default(''),
  guests: z.int('over_capacity').default(0),
  name: text('required').min(2, 'required').max(120, 'required'),
  email: email(),
  phone: text().regex(PHONE, 'invalid'),
  note: text('too_long').max(2000, 'too_long').default(''),
  consent: z.literal(true, 'required'),
  language,
  captcha_token: z.string().default(''),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

/**
 * Only the fields that are sent change. A number in `total_price` sets the price, `clear_price`
 * removes it and `auto_price` recalculates it from the nightly prices.
 */
export const adminBookingSchema = z
  .object({
    kind: text(),
    status: text(),
    apartment_ids: z.array(z.int()),
    check_in: text(),
    check_out: text(),
    guests: z.int(),
    name: text(),
    email: text(),
    phone: text(),
    note: text(),
    admin_note: text(),
    total_price: z.int().nullable(),
    language,
    message_id: z.int().nullable(),
  })
  .partial()
  .extend({
    clear_price: z.boolean().default(false),
    auto_price: z.boolean().default(false),
    /** Sends the guest an e-mail about the confirmation or cancellation. */
    notify: z.boolean().default(false),
    /** The owner's own words, added to that e-mail. */
    guest_message: z.string().max(2000, 'too_long').default(''),
  });
export type AdminBookingInput = z.infer<typeof adminBookingSchema>;

export const bookingListQuerySchema = z.object({
  /** `pending`, `confirmed`, `cancelled`, or `active` for the first two. */
  status: z.string().default(''),
  kind: z.string().default(''),
  /** Only bookings that overlap `[from, to)`. */
  from: z.string().default(''),
  to: z.string().default(''),
  q: z.string().default(''),
  /** `created` lists the newest first; otherwise by arrival. */
  order: z.string().default(''),
});
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

export const occupancyQuerySchema = z.object({
  from: z.string().default(''),
  to: z.string().default(''),
});
export type OccupancyQuery = z.infer<typeof occupancyQuerySchema>;

export const stayQuerySchema = z.object({
  check_in: z.string().default(''),
  check_out: z.string().default(''),
});
export type StayQuery = z.infer<typeof stayQuerySchema>;
