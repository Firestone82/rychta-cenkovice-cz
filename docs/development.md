# Development

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

The API creates its tables on start (see [Migrations](architecture.md#migrations)) and fills an empty database with the
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

## Photos

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
