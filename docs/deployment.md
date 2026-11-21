# Deployment

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
`RC_ENV=production`, `RC_WEB_DIR` pointing at `web/dist/web/browser` and the variables in [Configuration](#configuration).

To host the website elsewhere (a CDN, another domain), serve `web/dist/web/browser` with a
fallback to `index.html`, set `<meta name="rc-api-base">` in `index.html` to the API
address and list the website's origin in `RC_ALLOWED_ORIGINS`. Keep both on the same site
(for example `www.` and `api.` of one domain), because the refresh cookie is `SameSite=Strict`.

## Configuration

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
