import { randomBytes } from 'node:crypto';

/** No look-alikes (0/O, 1/I/L), so the code survives being read over the phone. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A short reference the guest can quote, e.g. `RC-7KQ2MX`. */
export function newBookingCode(): string {
  const letters = Array.from(randomBytes(6), (byte) => ALPHABET[byte % ALPHABET.length]);
  return `RC-${letters.join('')}`;
}
