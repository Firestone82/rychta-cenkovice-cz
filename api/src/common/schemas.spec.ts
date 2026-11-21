import { z } from 'zod';
import { email, fieldErrors, isPhone, language, localized, queryInt, text } from './schemas.js';

const issues = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value);
  return result.success ? {} : fieldErrors(result.error.issues);
};

describe('schemas', () => {
  it('reports one code per top-level field, the first that fails', () => {
    const schema = z.object({
      name: text('required').min(2, 'required'),
      email: email(),
      label: localized(5),
      nested: z.object({ deep: z.number() }),
    });
    expect(
      issues(schema, {
        name: ' ',
        email: 'x',
        label: { cs: 'too long', en: 5 },
        nested: { deep: 'x' },
      }),
    ).toEqual({
      name: 'required',
      email: 'invalid',
      label: 'too_long',
      nested: 'invalid',
    });
    expect(issues(schema, 'not an object')).toEqual({ body: 'invalid' });
  });

  it('trims text and recognises addresses and phone numbers', () => {
    expect(text().parse('  Jan  ')).toBe('Jan');
    expect(email().safeParse('jan@example.com').success).toBe(true);
    expect(email().safeParse('jan@example').success).toBe(false);
    expect(isPhone('+420 606 734 911')).toBe(true);
    expect(isPhone('call me')).toBe(false);
  });

  it('falls back to Czech for any language but English, also a missing one', () => {
    const form = z.object({ language });
    expect(form.parse({})).toEqual({ language: 'cs' });
    expect(form.parse({ language: 'en' })).toEqual({ language: 'en' });
    expect(form.parse({ language: 7 })).toEqual({ language: 'cs' });
  });

  it('reads numbers from a query string leniently', () => {
    const query = z.object({ offset: queryInt(0) });
    expect(query.parse({ offset: '24' })).toEqual({ offset: 24 });
    expect(query.parse({ offset: 'abc' })).toEqual({ offset: 0 });
    expect(query.parse({})).toEqual({ offset: 0 });
  });
});
