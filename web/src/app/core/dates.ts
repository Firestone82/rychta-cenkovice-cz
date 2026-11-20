/** Small helpers for calendar dates kept as ISO strings (YYYY-MM-DD), free of time zones. */

export function toISO(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isISO(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(parseISO(value).getTime())
  );
}

/** Today's date at the house (Europe/Prague). */
export function todayISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts;
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function addMonths(iso: string, months: number): string {
  const d = parseISO(iso);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISO(d);
}

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + '01';
}

export function daysInMonth(iso: string): number {
  const d = parseISO(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

export function nightsBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000);
}

/** Day of week with Monday = 0. */
export function weekday(iso: string): number {
  return (parseISO(iso).getUTCDay() + 6) % 7;
}
