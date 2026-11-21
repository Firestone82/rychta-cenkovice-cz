# Search engines

## What crawlers get

- **Finished HTML.** Public pages are rendered on the server (Angular SSR,
  `web/src/server.ts`), inside the API process: the API serves the static files and passes
  every other `GET` to the renderer (`api/src/web/static.middleware.ts`). The browser then
  hydrates the page. The administration (`/admin`) is rendered in the browser only.
  If rendering fails, the API sends the plain shell (`index.csr.html`) and the browser renders.
- **Status codes.** Unknown pages and apartments answer `404`; an apartment page whose data
  the API could not load answers `503`, so crawlers retry instead of dropping it. Addresses
  of the old website (`legacyRedirects` in `content/site.json`) answer `301`. The root `/`
  answers `302` to `/cs` or `/en` by `Accept-Language`; without the header (most crawlers)
  it goes to Czech.
- **Head of every page** (`SeoService`): title, description cut to 160 characters,
  canonical link, `hreflang` alternates for every language plus `x-default` (the root),
  Open Graph and Twitter card tags. Apartments use their first photo as the preview picture.
- **Structured data** (`utils/structured-data.util.ts`): `LodgingBusiness` with address,
  phone, e-mail, map and amenities on every page; `Apartment` and `BreadcrumbList` on
  apartment pages. The address is in `content/site.json`.
- **`/robots.txt` and `/sitemap.xml`** are written by the renderer
  (`utils/sitemap.util.ts`): every public page and active apartment in each language, with
  alternates. `/admin` and `/api/` are disallowed.

## How it works

- `RC_PUBLIC_URL` is the origin of canonical links and the sitemap. On the server the
  website calls the API at `http://127.0.0.1:<RC_PORT>` instead of the public address
  (`interceptors/server-api.interceptor.ts`). Both are passed in the request context
  (`config/render.config.ts`).
- API responses fetched during rendering travel to the browser in the page, so hydration
  does not load them again.
- Hydration runs without incremental hydration, because that would add an inline script and
  the content security policy allows none.
- Code that touches `window`, `localStorage` or the DOM runs in `afterNextRender`, in event
  handlers or behind `isPlatformServer`; use `DOCUMENT` instead of the global `document`.
  The cookie bar is left out of server pages and appears in the browser.
- `ng serve` renders on the server too, so problems show up in development.

## Checking

```bash
curl -s http://localhost:8080/cs/ubytovani/apartman-3 | grep -E '<title>|canonical|ld\+json'
curl -s http://localhost:8080/sitemap.xml
```

Validate structured data at https://search.google.com/test/rich-results and
https://validator.schema.org once the site is public.
