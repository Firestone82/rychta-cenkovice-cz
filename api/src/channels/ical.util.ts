import { addDays, houseDay, isIsoDate } from '../common/dates.util.js';

/** One event of a calendar feed, reduced to the days it takes. */
export interface CalendarEvent {
  /** The first night. */
  start: string;
  /** The day of departure, which is free again. */
  end: string;
}

const DATE_TIME = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;
const DURATION_DAYS = /^P(?:(\d+)W)?(?:(\d+)D)?/;

/** The day of an iCal date or date-time; a UTC time is read at the house. */
function dayOf(value: string): string | null {
  const match = DATE_TIME.exec(value.trim());
  if (!match) return null;
  const [, year, month, date, hour, minute, second, utc] = match;
  const day = `${year}-${month}-${date}`;
  if (!isIsoDate(day)) return null;
  return utc ? houseDay(new Date(`${day}T${hour}:${minute}:${second}Z`)) : day;
}

/** Splits `NAME;PARAM=x:value` at the first colon outside quotes. */
function property(line: string): [name: string, value: string] | null {
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    if (line[index] === '"') quoted = !quoted;
    else if (line[index] === ':' && !quoted) {
      const name = line.slice(0, index).split(';')[0].toUpperCase();
      return [name, line.slice(index + 1)];
    }
  }
  return null;
}

function eventOf(fields: Map<string, string>): CalendarEvent | null {
  if (fields.get('STATUS')?.trim().toUpperCase() === 'CANCELLED') return null;
  const start = dayOf(fields.get('DTSTART') ?? '');
  if (!start) return null;
  let end = dayOf(fields.get('DTEND') ?? '');
  if (!end) {
    const [, weeks, days] = DURATION_DAYS.exec(fields.get('DURATION')?.trim() ?? '') ?? [];
    end = addDays(start, Number(weeks ?? 0) * 7 + Number(days ?? 0));
  }
  // An event within one day still takes that night.
  return { start, end: end > start ? end : addDays(start, 1) };
}

/** The events of an iCal file, or null when the text is not a calendar. */
export function parseCalendar(text: string): CalendarEvent[] | null {
  if (!/^BEGIN:VCALENDAR\s*$/im.test(text)) return null;
  // A line starting with a space or a tab continues the previous one.
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events: CalendarEvent[] = [];
  let fields: Map<string, string> | null = null;
  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (upper === 'BEGIN:VEVENT') {
      fields = new Map();
    } else if (upper === 'END:VEVENT') {
      const event = fields && eventOf(fields);
      if (event) events.push(event);
      fields = null;
    } else if (fields) {
      const parsed = property(line);
      if (parsed && !fields.has(parsed[0])) fields.set(parsed[0], parsed[1]);
    }
  }
  return events;
}
