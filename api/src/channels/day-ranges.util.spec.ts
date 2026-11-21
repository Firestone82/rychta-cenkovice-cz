import { mergeRanges, subtractRanges } from './day-ranges.util.js';

const range = (from: string, to: string) => ({ from: `2027-07-${from}`, to: `2027-07-${to}` });

describe('day ranges', () => {
  it('merges overlapping ranges and keeps touching ones apart', () => {
    expect(
      mergeRanges([range('10', '14'), range('01', '05'), range('12', '17'), range('05', '08')]),
    ).toEqual([range('01', '05'), range('05', '08'), range('10', '17')]);
    expect(mergeRanges([range('03', '09'), range('04', '06'), range('07', '07')])).toEqual([
      range('03', '09'),
    ]);
  });

  it('cuts taken days out of a range', () => {
    expect(subtractRanges([range('01', '10')], [range('03', '05'), range('08', '12')])).toEqual([
      range('01', '03'),
      range('05', '08'),
    ]);
    expect(subtractRanges([range('03', '05')], [range('01', '10')])).toEqual([]);
    expect(subtractRanges([range('03', '05')], [range('05', '08'), range('01', '03')])).toEqual([
      range('03', '05'),
    ]);
  });
});
