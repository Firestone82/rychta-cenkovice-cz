import type { PhoneCountry } from '@models/site.model';

export interface PhoneParts {
  /** Dialling code such as `+420`. */
  dial: string;
  /** The number without the dialling code, as typed. */
  number: string;
}

/** The whole number as it is sent; empty while no number is typed. */
export function joinPhone({ dial, number }: PhoneParts): string {
  return number.trim() ? `${dial} ${number}` : '';
}

/**
 * Recognises a number written with its dialling code (`+420…` or `00420…`), as browsers
 * fill it in. Without a known code the text stays whole and `dial` is null.
 */
export function splitPhone(
  text: string,
  countries: readonly PhoneCountry[],
): { dial: string | null; number: string } {
  const typed = text.trimStart();
  const international = typed.startsWith('00') ? `+${typed.slice(2)}` : typed;
  if (!international.startsWith('+')) return { dial: null, number: text };
  const country = countries
    .filter((c) => international.startsWith(c.dial))
    .sort((a, b) => b.dial.length - a.dial.length)[0];
  if (!country) return { dial: null, number: text };
  return { dial: country.dial, number: international.slice(country.dial.length).trimStart() };
}
