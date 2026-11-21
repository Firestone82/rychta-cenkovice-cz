import { Column } from 'typeorm';

/** A text in both languages of the website, stored as `<name>_cs` and `<name>_en`. */
export class Localized {
  @Column({ type: 'text', default: '' })
  cs: string;

  @Column({ type: 'text', default: '' })
  en: string;
}

/** A list of short texts per language. */
export class LocalizedList {
  @Column({ type: 'jsonb', default: () => `'[]'` })
  cs: string[];

  @Column({ type: 'jsonb', default: () => `'[]'` })
  en: string[];
}
