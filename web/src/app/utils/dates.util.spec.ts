import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysInMonth,
  isISO,
  nightsBetween,
  startOfMonth,
  weekday,
} from './dates.util';

describe('dates', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('moves by whole months from the first day', () => {
    expect(addMonths('2026-11-20', 1)).toBe('2026-12-01');
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01');
    expect(addMonths('2027-01-01', -2)).toBe('2026-11-01');
  });

  it('counts nights and days', () => {
    expect(nightsBetween('2027-02-10', '2027-02-13')).toBe(3);
    expect(nightsBetween('2027-03-27', '2027-03-29')).toBe(2); // across the switch to summer time
    expect(daysInMonth('2028-02-01')).toBe(29);
    expect(startOfMonth('2027-07-19')).toBe('2027-07-01');
  });

  it('numbers weekdays from Monday', () => {
    expect(weekday('2026-11-16')).toBe(0); // Monday
    expect(weekday('2026-11-22')).toBe(6); // Sunday
  });

  it('recognises ISO dates', () => {
    expect(isISO('2027-02-10')).toBe(true);
    expect(isISO('10.2.2027')).toBe(false);
    expect(isISO('')).toBe(false);
    expect(isISO(null)).toBe(false);
  });
});
