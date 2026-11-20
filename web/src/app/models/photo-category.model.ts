/** Photo categories in display order; names are in the translations under `gallery.categories`. */
export const PHOTO_CATEGORIES = [
  'house',
  'apartment',
  'common-room',
  'facilities',
  'wellness',
  'surroundings',
  'winter',
  'trips',
] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export function isPhotoCategory(value: unknown): value is PhotoCategory {
  return (PHOTO_CATEGORIES as readonly unknown[]).includes(value);
}
