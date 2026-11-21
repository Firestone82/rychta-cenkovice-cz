import { parseCalendar } from './ical.util.js';

const calendar = (...events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n');
const event = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');

describe('parseCalendar', () => {
  it('reads whole-day events; the end is the day of departure', () => {
    const text = calendar(
      event('UID:1', 'DTSTART;VALUE=DATE:20270710', 'DTEND;VALUE=DATE:20270717', 'SUMMARY:Novák'),
      event('UID:2', 'DTSTART:20270801', 'DTEND:20270803'),
    );
    expect(parseCalendar(text)).toEqual([
      { start: '2027-07-10', end: '2027-07-17' },
      { start: '2027-08-01', end: '2027-08-03' },
    ]);
  });

  it('takes the day of a time at the house', () => {
    const text = calendar(
      event('DTSTART:20270710T220000Z', 'DTEND:20270717T080000Z'),
      event(
        'DTSTART;TZID="Europe/Prague":20270801T140000',
        'DTEND;TZID=Europe/Prague:20270803T100000',
      ),
    );
    expect(parseCalendar(text)).toEqual([
      { start: '2027-07-11', end: '2027-07-17' },
      { start: '2027-08-01', end: '2027-08-03' },
    ]);
  });

  it('gives an event without a usable end at least one night', () => {
    const text = calendar(
      event('DTSTART;VALUE=DATE:20270710'),
      event('DTSTART;VALUE=DATE:20270720', 'DURATION:P1W2D'),
      event('DTSTART;VALUE=DATE:20270801', 'DTEND;VALUE=DATE:20270801'),
    );
    expect(parseCalendar(text)).toEqual([
      { start: '2027-07-10', end: '2027-07-11' },
      { start: '2027-07-20', end: '2027-07-29' },
      { start: '2027-08-01', end: '2027-08-02' },
    ]);
  });

  it('joins folded lines and reads bare line feeds', () => {
    const text = calendar(event('DTSTART;VALUE=DATE:2027\r\n 0710', 'DTEND;VALUE=DATE:20270712'));
    expect(parseCalendar(text.replace(/\r\n(?! )/g, '\n'))).toEqual([
      { start: '2027-07-10', end: '2027-07-12' },
    ]);
  });

  it('skips cancelled and unreadable events', () => {
    const text = calendar(
      event('DTSTART;VALUE=DATE:20270710', 'DTEND;VALUE=DATE:20270712', 'STATUS:CANCELLED'),
      event('DTSTART;VALUE=DATE:20270231', 'DTEND;VALUE=DATE:20270303'),
      event('SUMMARY:no dates'),
    );
    expect(parseCalendar(text)).toEqual([]);
  });

  it('tells a calendar from any other text', () => {
    expect(parseCalendar('<html><body>Sign in</body></html>')).toBeNull();
    expect(parseCalendar(calendar())).toEqual([]);
  });
});
