/** Where a photo belongs. `misc` photos are kept but never shown in the public gallery. */
export const PHOTO_CATEGORIES = [
  'house',
  'surroundings',
  'apartment',
  'common-room',
  'facilities',
  'wellness',
  'trips',
  'winter',
  'misc',
] as const;

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];
