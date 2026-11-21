import type { Booking } from '@models/api.model';
import { occupancyLevel, yearOccupancy } from './occupancy.util';

const stay = (apartment_ids: number[], check_in: string, check_out: string) =>
  ({ apartment_ids, check_in, check_out }) as Booking;

describe('occupancy of a year', () => {
  it('names the level of a night', () => {
    expect(occupancyLevel(0, 4)).toBe('free');
    expect(occupancyLevel(1, 4)).toBe('some');
    expect(occupancyLevel(2, 4)).toBe('half');
    expect(occupancyLevel(3, 4)).toBe('half');
    expect(occupancyLevel(4, 4)).toBe('full');
  });

  it('counts the nights of a stay, not the day of departure', () => {
    const year = yearOccupancy(2027, [1, 2], [stay([1], '2027-03-30', '2027-04-02')], 'en');
    const taken = (iso: string) => year.flatMap((m) => m.days).find((d) => d.iso === iso)?.taken;
    expect([
      taken('2027-03-29'),
      taken('2027-03-30'),
      taken('2027-04-01'),
      taken('2027-04-02'),
    ]).toEqual([0, 1, 1, 0]);
    expect(year[2].name).toBe('March');
    expect(year[2].share).toBeCloseTo(2 / 62);
  });

  it('clips stays at the ends of the year and ignores other apartments', () => {
    const year = yearOccupancy(
      2027,
      [1, 2],
      [stay([1, 2], '2026-12-30', '2027-01-02'), stay([9], '2027-01-01', '2027-01-05')],
      'en',
    );
    expect(year[0].days.slice(0, 3).map((d) => [d.taken, d.level])).toEqual([
      [2, 'full'],
      [0, 'free'],
      [0, 'free'],
    ]);
    expect(year).toHaveLength(12);
  });
});
