const DAY = 86_400_000;
const HOUSE_TIME_ZONE = 'Europe/Prague';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: HOUSE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const toUtc = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const fromUtc = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** True for a real calendar day written as `YYYY-MM-DD`. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = toUtc(value);
  return !Number.isNaN(ms) && fromUtc(ms) === value;
}

/** Nights between two ISO dates; 0 when either is invalid. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return 0;
  return Math.round((toUtc(checkOut) - toUtc(checkIn)) / DAY);
}

export const addDays = (iso: string, days: number): string => fromUtc(toUtc(iso) + days * DAY);

export function addYears(iso: string, years: number): string {
  const date = new Date(toUtc(iso));
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return fromUtc(date.getTime());
}

/** The current date at the house, whatever time zone the server runs in. */
export const today = (): string => dayFormat.format(new Date());

/** RFC 3339 in UTC with second precision, as the API has always written timestamps. */
export const timestamp = (date: Date): string => date.toISOString().replace(/\.\d{3}Z$/, 'Z');
