# Rychta Čenkovice

The website of Rychta Čenkovice, six holiday apartments in the Orlické hory mountains,
with online booking requests and an administration for the owners.

- `web/` is the website and the administration: Angular 22, Czech and English.
- `api/` is the management API: Go, SQLite, JWT access tokens with rotating refresh tokens.
- `tools/` holds the image build script and a browser smoke test.

Visitors browse the apartments, the shared spaces, trips and the photo gallery, check the
occupancy calendar and send a booking request for the apartments that are free on their
dates. A request holds the dates until the owner confirms or declines it. The owner
confirms requests, enters bookings by hand (from a phone call or from a contact-form
message), blocks dates, and edits apartments, prices, photos and news.

## Run it locally

You need Go 1.26+ and Node 22+.

```bash
# 1. API on http://localhost:8080
cd api
go run ./cmd/rychta-api serve
```

On the first start in development the API creates `admin@rychtacenkovice.cz` and prints a
random password once. To choose the account yourself, set `RC_ADMIN_EMAIL` and
`RC_ADMIN_PASSWORD` (at least 12 characters) before the first start.

```bash
# 2. Website on http://localhost:4200 (proxies /api and /media to the API)
cd web
npm install
npm start
```

The administration is at `/admin`.

### Photos

Gallery and apartment photos live in the API, not in the repository. Import the photos of
the original site once:

```bash
cd api
go run ./cmd/rychta-api import-photos                 # downloads from www.rychtacenkovice.cz
go run ./cmd/rychta-api import-photos -dir ../photos  # or reads a local copy of /userFiles
```

Each photo is stored in three sizes with a blurred placeholder. New photos are uploaded in
the administration. `seed-demo` adds a few example bookings and messages to try things out.

The hero, season and trip images in `web/public/img` are built from the original photos by
`tools/make-static-images.py <folder>` (needs Pillow).

## Tests

```bash
cd api && go vet ./... && go test ./...   # booking rules, tokens, rate limits, forms
cd web && npx ng test --no-watch          # date helpers, form helpers, translation keys
```

`tools/e2e-smoke.js` drives a real browser through the main flows (booking request,
availability, contact form, sign-in, confirming, booking from a message, conflicts).
It needs Playwright and writes test data, so point it at a development database.

## Deploy

The simplest setup is one process: the API also serves the built website.

```bash
cp .env.example .env      # fill in RC_JWT_SECRET, the administrator and SMTP
docker compose up -d --build
docker compose exec rychta /app/rychta-api import-photos
```

Put a reverse proxy with HTTPS in front of port 8080. The database, the photos and the
e-mail outbox are in `./data`; back that folder up.

Without Docker: `make build`, then run `api/bin/rychta-api serve` with `RC_ENV=production`,
`RC_WEB_DIR` pointing at `web/dist/web/browser` and the variables below.

To host the website elsewhere (a CDN, another domain), serve `web/dist/web/browser` with a
fallback to `index.html`, set `<meta name="rc-api-base">` in `index.html` to the API
address and list the website's origin in `RC_ALLOWED_ORIGINS`. Keep both on the same site
(for example `www.` and `api.` of one domain), because the refresh cookie is `SameSite=Strict`.

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `RC_ENV` | `development` | `production` requires `RC_JWT_SECRET`, sets secure cookies and HSTS |
| `RC_ADDR` | `:8080` | listen address |
| `RC_DB_PATH` | `data/rychta.db` | SQLite database file |
| `RC_MEDIA_DIR` | `data/media` | processed photos |
| `RC_WEB_DIR` | | folder with the built website; empty means API only |
| `RC_PUBLIC_URL` | `http://localhost:4200` | public address, used for links in e-mails |
| `RC_ALLOWED_ORIGINS` | `http://localhost:4200` | browser origins that may call the API |
| `RC_TRUST_PROXY` | `false` | read the client address from `X-Forwarded-For` |
| `RC_JWT_SECRET` | random in development | signing key, at least 32 characters |
| `RC_ACCESS_TTL` | `10m` | access token lifetime (30 minutes at most) |
| `RC_REFRESH_TTL` | `168h` | a session ends after this long without use |
| `RC_SESSION_TTL` | `720h` | a session ends after this long in any case |
| `RC_COOKIE_SECURE` | `true` in production | send the refresh cookie over HTTPS only |
| `RC_ADMIN_EMAIL`, `RC_ADMIN_PASSWORD` | | first administrator, created if none exists |
| `RC_MAIL_FROM`, `RC_MAIL_TO` | | sender, and the owner's address for notifications |
| `RC_SMTP_HOST`, `RC_SMTP_PORT`, `RC_SMTP_USERNAME`, `RC_SMTP_PASSWORD`, `RC_SMTP_TLS` | | mail server; without a host, e-mails are written to `<data>/outbox` |
| `RC_PHOTO_SOURCE_URL` | the original site | where `import-photos` downloads from |

`rychta-api create-admin -email you@example.com` creates an administrator or resets a
password. It takes the password from `RC_ADMIN_PASSWORD` or asks for it on the terminal.

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
  scripts from its own origin only.
- The public forms are rate limited and carry a honeypot field.

## How bookings work

- A booking covers one or more apartments from the arrival day to the departure day. The
  departure day is free for the next arrival.
- A request from the website is `pending` and holds its dates. The owner confirms or
  declines it; the guest is told by e-mail in their language.
- The availability check and the insert run in one database transaction, so two people
  cannot book the same apartment for overlapping dates.
- Prices are optional. An apartment without a nightly price shows "price on request", and
  the owner sets the total when confirming.

## API

All endpoints are under `/api/v1`.

| | |
| --- | --- |
| `GET /apartments`, `GET /apartments/{slug}` | apartments with photos |
| `GET /availability?from&to` | occupied ranges for the calendar |
| `GET /availability/check?check_in&check_out` | apartments taken in those dates |
| `POST /bookings` | booking request |
| `POST /contact` | contact form |
| `GET /photos?category&apartment&offset&limit`, `GET /photos/covers` | gallery, paged |
| `GET /news` | published news |
| `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `GET /auth/me` | session |
| `GET /admin/dashboard` | counts, arrivals, departures, pending requests |
| `/admin/bookings`, `/admin/messages`, `/admin/apartments`, `/admin/photos`, `/admin/news` | management (Bearer token) |

## Things to finish before going live

- Add the operator's legal identity (name or company, registration number) to the privacy
  page texts in `web/src/app/core/i18n/cs.ts` and `en.ts`. The original site did not state it.
- Enter nightly prices in the administration, or keep "price on request".
- Configure SMTP so guests and the owner receive e-mails.
- The occupancy shown on the old site came from an embedded e-chalupy.cz calendar. Enter
  the existing bookings in the administration so the new calendar starts correct.

## Fonts

Sofia Sans and Sofia Sans Extra Condensed, SIL Open Font License 1.1, self-hosted in
`web/public/fonts`.
