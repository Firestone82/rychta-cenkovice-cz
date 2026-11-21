import { z } from 'zod';
import { localized, text } from '../common/schemas.js';
import { AMENITIES, FLAT_TYPES } from './apartment-options.js';

const TEXT_LIMIT = 1000;
const FEATURE_LIMIT = 60;
const LABEL_LIMIT = 40;

const whole = (min: number, max: number) =>
  z.int('invalid').min(min, 'invalid').max(max, 'invalid');

/** Only the fields that are sent change. `clear_price` removes the price ("on request"). */
export const apartmentUpdateSchema = z
  .object({
    area: whole(1, 1000),
    beds: whole(1, 50),
    extra_beds: whole(0, 20),
    accessible: z.boolean('invalid'),
    floor: whole(1, 3),
    flat_type: z.enum(['', ...FLAT_TYPES], 'invalid'),
    amenities: z.array(z.enum(AMENITIES, 'invalid'), 'invalid'),
    labels: z.array(localized(LABEL_LIMIT), 'invalid'),
    layout: z.object({ cs: z.string().default(''), en: z.string().default('') }),
    features: z.object({
      cs: z.array(z.string()).default([]),
      en: z.array(z.string()).default([]),
    }),
    note: z.object({ cs: z.string().default(''), en: z.string().default('') }),
    description: z.object({
      cs: text().max(4000, 'too_long').default(''),
      en: text().max(4000, 'too_long').default(''),
    }),
    price_per_night: whole(0, 1_000_000).nullable(),
    min_nights: whole(1, 30),
    active: z.boolean('invalid'),
  })
  .partial()
  .extend({ clear_price: z.boolean().default(false) })
  .superRefine((value, ctx) => {
    // The administration shows one error for the whole group of short texts.
    const tooLong =
      [value.layout, value.note].some(
        (v) => v && (v.cs.length > TEXT_LIMIT || v.en.length > TEXT_LIMIT),
      ) ||
      (value.features !== undefined &&
        (value.features.cs.length > FEATURE_LIMIT || value.features.en.length > FEATURE_LIMIT));
    if (tooLong) ctx.addIssue({ code: 'custom', path: ['texts'], message: 'too_long' });
  });

export type ApartmentUpdate = z.infer<typeof apartmentUpdateSchema>;
