import type { Dict, Lang } from '@models/i18n.model';

/** One lazy chunk per language. A new language needs an entry here, in `Lang` and in content/site.json. */
export const DICTIONARIES: Record<Lang, () => Promise<Dict>> = {
  cs: () => import('@content/i18n/cs.json').then((m): Dict => m.default),
  en: () => import('@content/i18n/en.json').then((m): Dict => m.default),
};
