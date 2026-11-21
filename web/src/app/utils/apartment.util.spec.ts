import { describe, expect, it } from 'vitest';
import { roomCount } from './apartment.util';

describe('roomCount', () => {
  it('reads the rooms from the flat type', () => {
    expect(roomCount('3+1')).toBe(3);
    expect(roomCount('2+kk')).toBe(2);
  });

  it('counts a studio as one room and nothing when the type is not set', () => {
    expect(roomCount('studio')).toBe(1);
    expect(roomCount('')).toBe(0);
  });
});
