/** Days from `from` up to, but not including, `to`; both are ISO dates. */
export interface DayRange {
  from: string;
  to: string;
}

/** The same days as ordered ranges that do not overlap. Ranges that only touch stay apart. */
export function mergeRanges(ranges: DayRange[]): DayRange[] {
  const merged: DayRange[] = [];
  for (const range of [...ranges].sort((a, b) => a.from.localeCompare(b.from))) {
    const last = merged.at(-1);
    if (last && range.from < last.to) {
      if (range.to > last.to) last.to = range.to;
    } else if (range.from < range.to) {
      merged.push({ ...range });
    }
  }
  return merged;
}

/** What is left of `ranges` after the days of `taken` are cut out. */
export function subtractRanges(ranges: DayRange[], taken: DayRange[]): DayRange[] {
  const cuts = mergeRanges(taken);
  const left: DayRange[] = [];
  for (const range of ranges) {
    let from = range.from;
    for (const cut of cuts) {
      if (cut.to <= from || cut.from >= range.to) continue;
      if (cut.from > from) left.push({ from, to: cut.from });
      from = cut.to;
    }
    if (from < range.to) left.push({ from, to: range.to });
  }
  return left;
}
