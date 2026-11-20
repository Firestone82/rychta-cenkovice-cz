import type { Season } from '@models/i18n.model';

export const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn'];

export function currentSeason(date = new Date()): Season {
  const month = date.getMonth() + 1;
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}
