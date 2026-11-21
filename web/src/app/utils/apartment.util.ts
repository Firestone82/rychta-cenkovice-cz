import type { FlatType } from '@models/apartment-options.model';

/** Number of rooms of a flat type: "3+1" and "3+kk" have three, a studio one; 0 when it is not set. */
export function roomCount(flatType: FlatType | ''): number {
  if (flatType === 'studio') return 1;
  return Number.parseInt(flatType, 10) || 0;
}
