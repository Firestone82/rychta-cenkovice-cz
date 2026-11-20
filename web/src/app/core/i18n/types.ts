export type Lang = 'cs' | 'en';

/** Plural forms: Czech needs one / few / other, English one / other. */
export interface Plural {
  one: string;
  few?: string;
  other: string;
}

export interface SpaceContent {
  title: string;
  fact: string;
  factLabel: string;
  intro: string;
  groups: { title: string; items: string[] }[];
}

export interface Trip {
  name: string;
  /** Distance from the house in kilometres, as stated by the owners. */
  km: number | null;
  text?: string;
  /** Name of a bundled thumbnail (public/img/trip-<img>-*.webp). */
  img?: string;
  url?: string;
}

export type Dict = typeof import('./cs').cs;
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
