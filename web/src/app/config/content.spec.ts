import images from '@content/images.json';
import cs from '@content/i18n/cs.json';
import en from '@content/i18n/en.json';
import { DICTIONARIES } from './languages.config';
import { SITE } from './site.config';

/** Dotted paths of every leaf, with array items collapsed, so two dictionaries can be compared. */
function keys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return value.length ? keys(value[0], `${prefix}[]`) : [`${prefix}[]`];
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe('content', () => {
  const codes = SITE.languages.map((l) => l.code);

  it('has a dictionary loader for every language', () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual([...codes].sort());
    expect(codes).toContain(SITE.defaultLanguage);
    expect(codes).toContain(SITE.fallbackLanguage);
  });

  it('gives every dictionary the same keys', () => {
    const ignore = (k: string) =>
      !k.endsWith('.few') && !k.includes('trips[]') && !k.includes('resorts[]');
    expect(new Set(keys(en).filter(ignore))).toEqual(new Set(keys(cs).filter(ignore)));
  });

  it('has a route for every page in every language', () => {
    for (const [page, paths] of Object.entries(SITE.routes))
      for (const code of codes) expect(typeof paths[code], `${page}/${code}`).toBe('string');
    for (const code of codes) expect(SITE.apartmentSlug[code]).toBeTruthy();
  });

  it('points media at images that exist', () => {
    const names = [
      ...Object.values(SITE.media.hero),
      ...Object.values(SITE.media.seasons),
      SITE.media.aerialVideo.poster,
    ];
    for (const name of names) expect(Object.keys(images), name).toContain(name);
  });

  it('redirects old addresses to existing languages', () => {
    for (const target of Object.values(SITE.legacyRedirects))
      expect(codes, target).toContain(target.replace(/^\//, '').split('/')[0]);
  });
});
