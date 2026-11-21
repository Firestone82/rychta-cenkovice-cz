# How the code is organised

## Website (`web/src`)

| Folder | Holds |
| --- | --- |
| `app/components/` | Every component in a folder of its own with `.ts`, `.html` and `.scss`. A component used by one parent only lives inside that parent's folder; the administration's components are under `components/admin/`. |
| `app/pages/` | One folder per route. A page loads its data and arranges components. |
| `app/layout/` | The frames around the pages: `site` (header, footer, cookie bar) and `admin` (sidebar, top bar). |
| `app/utils/` | Shared logic without state, as `*.util.ts` with tests next to it. |
| `app/services/`, `guards/`, `interceptors/`, `directives/` | API access, session, translations, consent; route guards; the token interceptor; the scroll reveal. |
| `app/models/`, `app/config/` | Types of the API and of the content files; the typed entry points to the content. |
| `content/` | What the site says and shows, as JSON (below). |
| `styles/` | Design tokens and the few global styles. |

Imports use aliases (`@components/…`, `@utils/…`, `@content/…`), defined in `web/tsconfig.json`.
Every component input and output carries a one-line description.

### Waiting for the API in the administration

- **Loading a page:** the page puts its real components into `rc-admin-skeleton`, filled with
  stand-ins from `utils/placeholders.util.ts`. They are drawn as grey shapes, so the loading
  state always has the layout of the loaded page and needs no markup of its own. Text that is
  the same for any data stays readable when its element carries `data-static`.
- **Pressing a button:** a button that calls the API takes `[rcBusy]="busy()"`
  (`directives/busy.directive.ts`). While the request runs it cannot be pressed, and the
  pressed one shows a turning ring in place of its label without changing its size.

## Content in JSON

- `content/site.json`: languages, contact details, map links, the address of each page in
  each language, redirects from the old website.
- `content/images.json`: the bundled images with their sizes and descriptions.
- `content/i18n/<language>.json`: every text of the website and the administration.

The files are compiled into the build, so a change takes a rebuild, and
`app/config/content.spec.ts` fails the tests when a language misses a key or `site.json`
has a wrong shape. Apartments, prices and photos are edited in the administration
and come from the API.

To add a language: copy `content/i18n/en.json` and translate it, add the language to
`languages` and to every entry of `routes` in `content/site.json`, to the `Lang` type in
`app/models/i18n.model.ts` and to `app/config/languages.config.ts`. Texts stored in the
API (apartment texts, labels, photo descriptions) are Czech and English only.

## API (`api/src`)

One folder per feature (`apartments`, `bookings`, `photos`, `messages`, `auth`,
`users`, `forms`, `mail`, `site`, `seed`), each a NestJS module with its entity, request
schemas, service and controllers. `common/` has the error format, validation helpers and
the rate limiter, `config/` the typed settings, `database/` the TypeORM setup and the
migrations, `web/` the security headers and static files.

- Requests are validated with Zod schemas on the controller parameters. A failed rule
  answers `422` with one code per field: `{ "error": { "code": "validation", "fields": { "email": "invalid" } } }`.
- Every error has the same shape, `{ "error": { "code", "message" } }`.
- Booking overlaps are prevented in the database transaction that stores the booking, by
  locking the apartments first.

## Migrations

The schema changes only through migrations in `api/src/database/migrations`; the API
never synchronises it from the entities. Pending migrations run when the API starts
(`RC_DATABASE_MIGRATE=false` switches that off, to run them as a separate deploy step).

```bash
cd api
npm run migration:generate -- src/database/migrations/AddSomething   # after changing an entity
# then list the new class in src/database/migrations/index.ts
npm run migration:run
npm run migration:revert
npm run migration:show
npm run migration:check   # fails when the entities and the migrated database differ
```
