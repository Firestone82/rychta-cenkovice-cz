import { robotsTxt, sitemapXml } from './sitemap.util';

describe('sitemap', () => {
  const xml = sitemapXml('https://example.cz', [3]);

  it('lists the pages in every language with their alternates', () => {
    expect(xml).toContain('<loc>https://example.cz/cs</loc>');
    expect(xml).toContain('<loc>https://example.cz/en/accommodation/common-room</loc>');
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://example.cz/en/things-to-do"/>',
    );
  });

  it('lists the apartments with translated addresses', () => {
    expect(xml).toContain('<loc>https://example.cz/cs/ubytovani/apartman-3</loc>');
    expect(xml).toContain('<loc>https://example.cz/en/accommodation/apartment-3</loc>');
  });

  it('leaves out pages that are not meant for search results', () => {
    expect(xml).not.toContain('admin');
    expect(xml).not.toContain(':slug');
  });

  it('points robots at the sitemap and away from the administration', () => {
    const robots = robotsTxt('https://example.cz');
    expect(robots).toContain('Sitemap: https://example.cz/sitemap.xml');
    expect(robots).toContain('Disallow: /admin');
  });
});
