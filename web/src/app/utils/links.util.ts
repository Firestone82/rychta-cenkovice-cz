import { SITE } from '@config/site.config';
import type { Lang } from '@models/i18n.model';

export function apartmentSlug(number: number, lang: Lang): string {
  return `${SITE.apartmentSlug[lang]}-${number}`;
}

export function apartmentNumber(slug: string | null | undefined): number | null {
  const match = /-(\d+)$/.exec(slug ?? '');
  return match ? Number(match[1]) : null;
}

/** A path such as `/cs/ubytovani` from routerLink commands. */
export function commandsToPath(commands: string[]): string {
  return commands.join('/').replace('//', '/');
}
