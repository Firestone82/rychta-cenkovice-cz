# Rychta Čenkovice

The website of Rychta Čenkovice, six holiday apartments in the Orlické hory mountains,
with online booking requests and an administration for the owners.

- `web/` is the website and the administration: Angular 22, Czech and English.
- `api/` is the management API: NestJS 12, PostgreSQL with TypeORM migrations, JWT access
  tokens with rotating refresh tokens, OpenAPI documentation.
- `tools/` holds the image build script and a browser smoke test.
- `.github/workflows/` lints, tests and builds every push, and deploys `main`.

Visitors browse the apartments, the shared spaces, trips and the photo gallery, check the
occupancy calendar and send a booking request for the apartments that are free on their
dates. A request holds the dates until the owner confirms or declines it. The owner
confirms requests, enters bookings by hand (from a phone call or from a contact-form
message), blocks dates, and edits apartments, prices and photos.

## Run it locally

You need Node 22+ and PostgreSQL 14+ (or Docker, which starts one for you).

```bash
# 1. Database on localhost:5432, with the databases `rychta` and `rychta_test`
docker compose -f docker-compose.dev.yml up -d

# 2. API on http://localhost:8080, restarting on changes
cd api
npm install
npm run start:dev
```

The API creates its tables on start (see Migrations) and fills an empty database with the
six apartments and the catalogue of the original photos. On the first start in development
it also creates `admin@rychtacenkovice.cz` and prints a random password once. To choose the
account yourself, set `RC_ADMIN_EMAIL` and `RC_ADMIN_PASSWORD` (at least 12 characters)
before the first start. Settings are read from the environment and from `.env` in `api/` or
in the repository root.

```bash
# 3. Website on http://localhost:4200 (proxies /api and /media to the API)
cd web
npm install
npm start
```

The administration is at `/admin`, the API documentation at http://localhost:8080/api/docs.

With your own PostgreSQL instead of Docker, create a role and the two databases and set
`RC_DATABASE_URL` if they differ from the default:

```sql
CREATE ROLE rychta LOGIN PASSWORD 'rychta';
CREATE DATABASE rychta OWNER rychta;
CREATE DATABASE rychta_test OWNER rychta;
```

### Photos

Gallery and apartment photos live in the API, not in the repository. Import the photos of
the original site once (after `npm run build` in `api/`):

```bash
cd api
npm run cli -- import-photos                  # downloads from www.rychtacenkovice.cz
npm run cli -- import-photos --dir ../photos  # or reads a local copy of /userFiles
```

Each photo is stored in three sizes with a blurred placeholder. New photos are uploaded in
the administration. `npm run cli -- seed-demo` adds a few example bookings and messages to
try things out, and `npm run cli -- create-admin --email you@example.com` creates an
administrator or resets a password; it takes the password from `RC_ADMIN_PASSWORD` or asks
for it on the terminal.

The hero, season and trip images in `web/public/img` are built from the original photos by
`tools/make-static-images.py <folder>` (needs Pillow).

## How the code is organised

### Website (`web/src`)

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

### Content in JSON

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

### API (`api/src`)

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

### Migrations

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

## Tests and linting

```bash
cd api
npm run lint && npm run format:check
npm test             # unit tests
npm run test:e2e     # the whole API over HTTP against the `rychta_test` database, which it empties

cd web
npm run lint && npm run format:check
npx ng test --no-watch
```

The API's end-to-end tests cover the booking rules and simultaneous requests, sign-in,
token rotation and reuse, rate limits, the forms with a stand-in for hCaptcha, photo
uploads, and the administration. `RC_TEST_DATABASE_URL` points them at another database.

`tools/e2e-smoke.js` drives a real browser through the main flows (booking request,
availability, contact form, sign-in, confirming, booking from a message, conflicts).
It needs Playwright and writes test data, so point it at a development database.

## Continuous integration and deployment

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: lint,
format check, tests and build for the website and for the API (with a PostgreSQL service,
including a check that the migrations match the entities), and a build of the Docker image.

`.github/workflows/deploy.yml` runs after CI passed on `main` (or by hand). It publishes
the image as `ghcr.io/<owner>/<repository>` with the tags `latest` and the commit, and,
when a server is configured, copies `docker-compose.yml` there, pulls the image and
restarts the service. The database migrates when the new container starts.

To switch the server step on, set in the repository settings:

| | |
| --- | --- |
| Variables `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` | the server, the account, and the folder that holds `.env` |
| Secret `DEPLOY_SSH_KEY` | a private key that account accepts |
| Secret `DEPLOY_KNOWN_HOSTS` | the output of `ssh-keyscan <host>` |

The server needs Docker with the compose plugin, and the account must be allowed to run it.
The job uses the `production` environment, so a required reviewer can be added there.

## Deploy by hand

The simplest setup is one container: the API also serves the built website, with
PostgreSQL next to it.

```bash
cp .env.example .env      # fill in POSTGRES_PASSWORD, RC_JWT_SECRET, the administrator and SMTP
docker compose up -d --build
docker compose exec rychta node dist/cli.js import-photos
```

Put a reverse proxy with HTTPS in front of port 8080. Back up the database
(`docker compose exec db pg_dump -U rychta rychta`) and the `data` volume, which holds the
photos (`docker compose cp rychta:/data ./backup`).

Without Docker: `make build`, then run `node dist/main.js` in `api/` with
`RC_ENV=production`, `RC_WEB_DIR` pointing at `web/dist/web/browser` and the variables below.

To host the website elsewhere (a CDN, another domain), serve `web/dist/web/browser` with a
fallback to `index.html`, set `<meta name="rc-api-base">` in `index.html` to the API
address and list the website's origin in `RC_ALLOWED_ORIGINS`. Keep both on the same site
(for example `www.` and `api.` of one domain), because the refresh cookie is `SameSite=Strict`.

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `RC_ENV` | `development` | `production` requires `RC_JWT_SECRET`, sets secure cookies and HSTS, hides the API documentation |
| `RC_HOST`, `RC_PORT` | `0.0.0.0`, `8080` | listen address |
| `RC_DATABASE_URL` | `postgres://rychta:rychta@localhost:5432/rychta` | PostgreSQL connection |
| `RC_DATABASE_SSL` | `false` | connect to the database over TLS |
| `RC_DATABASE_MIGRATE` | `true` | run pending migrations on start |
| `RC_MEDIA_DIR` | `data/media` | processed photos |
| `RC_OUTBOX_DIR` | `data/outbox` | where e-mails are written when no mail server is set |
| `RC_WEB_DIR` | | folder with the built website; empty means API only |
| `RC_PUBLIC_URL` | `http://localhost:4200` | public address, used for links in e-mails |
| `RC_ALLOWED_ORIGINS` | `http://localhost:4200` | browser origins that may call the API |
| `RC_TRUST_PROXY` | `false` | read the client address from `X-Forwarded-For` |
| `RC_API_DOCS` | `true` outside production | serve the OpenAPI documentation at `/api/docs` |
| `RC_JWT_SECRET` | random in development | signing key, at least 32 characters |
| `RC_ACCESS_TTL` | `10m` | access token lifetime (30 minutes at most) |
| `RC_REFRESH_TTL` | `7d` | a session ends after this long without use |
| `RC_SESSION_TTL` | `30d` | a session ends after this long in any case |
| `RC_COOKIE_SECURE` | `true` in production | send the refresh cookie over HTTPS only |
| `RC_ADMIN_EMAIL`, `RC_ADMIN_PASSWORD` | | first administrator, created if none exists |
| `RC_MAIL_FROM`, `RC_MAIL_TO` | | sender, and the owner's address for notifications |
| `RC_SMTP_HOST`, `RC_SMTP_PORT`, `RC_SMTP_USERNAME`, `RC_SMTP_PASSWORD`, `RC_SMTP_TLS` | | mail server; without a host, e-mails are written to `RC_OUTBOX_DIR` |
| `RC_HCAPTCHA_SITEKEY`, `RC_HCAPTCHA_SECRET` | | hCaptcha keys; with both set, the booking request and the contact form need a solved hCaptcha. Leave both empty to switch it off |
| `RC_PHOTO_SOURCE_URL` | the original site | where `import-photos` downloads from |

Durations are written as `10m`, `168h` or `30d`.

## How sign-in is kept safe

- Passwords are hashed with Argon2id. Sign-in is limited to five failures per fifteen
  minutes, per address and per account.
- The access token is a JWT that lives ten minutes and is kept only in the page's memory,
  never in `localStorage`.
- The refresh token is a random value in an `HttpOnly`, `SameSite=Strict` cookie that the
  browser sends only to `/api/v1/auth`. The server stores its hash. Every refresh replaces
  it; presenting an old one ends the whole session, because that means it was copied.
- A session ends after seven days without use and after thirty days in any case. Changing
  the password signs out every other device.
- Requests that change the session need the `X-Requested-With: rychta-web` header and an
  allowed `Origin`. The website is served with a Content-Security-Policy that allows
  scripts from its own origin only, plus `hcaptcha.com` when hCaptcha is switched on.
- The public forms are rate limited and carry a honeypot field.

## Cookies and hCaptcha

- On a first visit the website shows a cookie bar with "Allow all", "Necessary only" and
  "Settings". Nothing optional is stored or loaded before a choice. The choice can be
  changed at any time with "Cookie settings" in the footer or on the privacy page.
- Necessary: the choice itself (`rc-consent` in local storage), the administrator's
  refresh cookie and the language of the administration. Preferences: the remembered
  language of the website (`rc-lang`). Form protection: hCaptcha.
- With `RC_HCAPTCHA_SITEKEY` and `RC_HCAPTCHA_SECRET` set, the booking request and the
  contact form show an hCaptcha check and the API verifies every answer with
  `https://api.hcaptcha.com/siteverify` before it stores anything. The hCaptcha script is
  loaded only on those two forms and only after the visitor allowed it; a visitor who has
  not is asked right at the form. If hCaptcha cannot be reached, the form is not accepted
  and the visitor is asked to try again or call.
- The server must be able to reach `api.hcaptcha.com`. If the website is served by
  something other than the API (which sets the policy itself), allow
  `https://hcaptcha.com https://*.hcaptcha.com` in `script-src`, `style-src`, `frame-src`
  and `connect-src`.
- Without the keys the forms work as before and the cookie settings and the privacy page
  do not mention hCaptcha.

## How bookings work

- A booking covers one or more apartments from the arrival day to the departure day. The
  departure day is free for the next arrival.
- A request from the website is `pending` and holds its dates. The owner confirms or
  declines it; the guest is told by e-mail in their language.
- The availability check and the insert run in one database transaction that first locks
  the apartments, so two people cannot book the same apartment for overlapping dates.
- Flat type, floor and equipment come from fixed lists (`api/src/apartments/apartment-options.ts`
  and `web/src/app/models/apartment-options.model.ts`, kept in step). Labels, the
  description and the other texts are free and bilingual.
- Prices are optional. An apartment without a nightly price shows "price on request", and
  the owner sets the total when confirming.

## API

All endpoints are under `/api/v1`. Every endpoint with its request shape, to try out in the browser, is in the OpenAPI
documentation at `/api/docs` (JSON at `/api/docs-json`).

| | |
| --- | --- |
| `GET /apartments`, `GET /apartments/{slug}` | apartments with photos |
| `GET /availability?from&to` | occupied ranges for the calendar |
| `GET /availability/check?check_in&check_out` | apartments taken in those dates |
| `GET /health` | answers once the database is reachable |
| `GET /config` | what the website needs to know up front: the hCaptcha site key |
| `POST /bookings` | booking request (`captcha_token` when hCaptcha is on) |
| `POST /contact` | contact form (`captcha_token` when hCaptcha is on) |
| `GET /photos?category&apartment&offset&limit`, `GET /photos/covers` | gallery, paged |
| `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `GET /auth/me` | session |
| `GET /admin/dashboard` | counts, arrivals, departures, pending requests |
| `/admin/bookings`, `/admin/messages`, `/admin/apartments`, `/admin/photos` | management (Bearer token) |

## Things to finish before going live

- Add the operator's legal identity (name or company, registration number) to the privacy
  page texts in `web/src/content/i18n/cs.json` and `en.json`. The original site did not state it.
- Enter nightly prices in the administration, or keep "price on request".
- Configure SMTP so guests and the owner receive e-mails.
- Create an hCaptcha site at dashboard.hcaptcha.com and set `RC_HCAPTCHA_SITEKEY` and
  `RC_HCAPTCHA_SECRET`. Then send one booking request and one contact message on the live
  site: the hCaptcha widget and the real verification call could not be run during
  development, only the code around them (see `api/src/forms/captcha.service.ts`).
- The occupancy shown on the old site came from an embedded e-chalupy.cz calendar. Enter
  the existing bookings in the administration so the new calendar starts correct.

- Create the GitHub repository, push, and set the deploy variables and secrets above. The
  workflows have not run yet.

## Fonts

Sofia Sans and Sofia Sans Extra Condensed, SIL Open Font License 1.1, self-hosted in
`web/public/fonts`.
