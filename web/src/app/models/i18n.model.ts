import type cs from '@content/i18n/cs.json';

export type Lang = 'cs' | 'en';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/** Czech needs one / few / other, English only one / other. */
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
  km: number | null;
  text?: string;
  /** Key of a bundled thumbnail: `trip-<img>` in content/images.json. */
  img?: string;
  url?: string;
}

/** Replaces plural objects inferred from cs.json (which always carry `few`) with `Plural`. */
type Loosen<T> = T extends { one: string; other: string }
  ? Plural
  : T extends readonly (infer U)[]
    ? Loosen<U>[]
    : T extends object
      ? { [K in keyof T]: Loosen<T[K]> }
      : T;

/**
 * Shape of a dictionary, taken from content/i18n/cs.json. Every other language file must
 * provide the same keys; the compiler checks that in config/languages.config.ts.
 */
export type Dict = Omit<Loosen<typeof cs>, 'trips' | 'resorts'> & {
  trips: Trip[];
  resorts: Trip[];
};
