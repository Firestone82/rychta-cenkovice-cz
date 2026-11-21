import { z } from 'zod';
import { queryInt, text } from '../common/schemas.js';

export const photoListQuerySchema = z.object({
  category: z.string().default(''),
  apartment: queryInt(0),
  offset: queryInt(0),
  limit: queryInt(0),
});
export type PhotoListQuery = z.infer<typeof photoListQuerySchema>;

const alt = z.object({ cs: text().default(''), en: text().default('') });

export const photoUpdateSchema = z.object({
  category: z.string().optional(),
  apartment_id: z.int().optional(),
  alt: alt.optional(),
  sort: z.int().optional(),
});
export type PhotoUpdate = z.infer<typeof photoUpdateSchema>;

/** The text fields of the multipart upload; the file itself is handled by the upload interceptor. */
export const photoUploadSchema = z.object({
  category: z.string().default(''),
  apartment_id: queryInt(0),
  alt_cs: text().default(''),
  alt_en: text().default(''),
});
export type PhotoUpload = z.infer<typeof photoUploadSchema>;
