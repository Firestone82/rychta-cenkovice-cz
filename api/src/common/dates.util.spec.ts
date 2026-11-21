import { addDays, addYears, isIsoDate, nightsBetween, timestamp, today } from './dates.util.js';

describe('dates', () => {
  afterEach(() => vi.useRealTimers());

  it('accepts only real calendar days', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2027-02-29')).toBe(false);
    expect(isIsoDate('2027-13-01')).toBe(false);
    expect(isIsoDate('2027-1-1')).toBe(false);
    expect(isIsoDate(20270101)).toBe(false);
  });

  it('counts nights across a clock change', () => {
    expect(nightsBetween('2027-03-27', '2027-03-29')).toBe(2);
    expect(nightsBetween('2027-10-30', '2027-11-01')).toBe(2);
    expect(nightsBetween('2027-05-10', '2027-05-10')).toBe(0);
    expect(nightsBetween('nonsense', '2027-05-10')).toBe(0);
  });

  it('adds days and years over month and year ends', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(addYears('2026-11-21', 2)).toBe('2028-11-21');
  });

  it('takes today from the clock at the house, not the server’s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-31T23:30:00Z'));
    expect(today()).toBe('2027-02-01');
    vi.setSystemTime(new Date('2027-07-01T21:59:00Z'));
    expect(today()).toBe('2027-07-01');
  });

  it('writes timestamps without milliseconds', () => {
    expect(timestamp(new Date('2027-01-31T23:30:05.678Z'))).toBe('2027-01-31T23:30:05Z');
  });
});
