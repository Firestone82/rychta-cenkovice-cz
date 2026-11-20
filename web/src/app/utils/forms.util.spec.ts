import { describe, expect, it } from 'vitest';
import { fieldMessage, isEmail, isPhone } from './forms.util';
import cs from '@content/i18n/cs.json';
import en from '@content/i18n/en.json';

describe('form helpers', () => {
  it('checks e-mail addresses', () => {
    expect(isEmail('host@example.com')).toBe(true);
    expect(isEmail(' host@example.com ')).toBe(true);
    expect(isEmail('host@example')).toBe(false);
    expect(isEmail('host example@x.cz')).toBe(false);
  });

  it('checks phone numbers', () => {
    expect(isPhone('+420 606 734 911')).toBe(true);
    expect(isPhone('606734911')).toBe(true);
    expect(isPhone('12')).toBe(false);
    expect(isPhone('call me')).toBe(false);
  });

  it('turns API error codes into sentences', () => {
    expect(fieldMessage(cs, 'email', 'invalid')).toBe(cs.errors.invalid_email);
    expect(fieldMessage(cs, 'consent', 'required')).toBe(cs.errors.consent);
    expect(fieldMessage(en, 'guests', 'over_capacity')).toBe(en.errors.over_capacity);
    expect(fieldMessage(en, 'name', 'required')).toBe(en.errors.required);
  });
});

describe('translations', () => {
  const keys = (value: unknown, prefix = ''): string[] =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
      : [prefix];

  it('have the same keys in Czech and English', () => {
    // Plural forms differ by design: Czech has a "few" form, English does not.
    const comparable = (dict: unknown) =>
      keys(dict)
        .filter((key) => !key.startsWith('plural.'))
        .sort();
    expect(comparable(en)).toEqual(comparable(cs));
  });

  it('list the same trips in both languages', () => {
    expect(en.trips.length).toBe(cs.trips.length);
    expect(en.resorts.length).toBe(cs.resorts.length);
    expect(en.trips.map((t) => t.km)).toEqual(cs.trips.map((t) => t.km));
  });
});
