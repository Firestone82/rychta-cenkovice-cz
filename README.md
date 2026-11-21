# Rychta Čenkovice

The website of Rychta Čenkovice, six holiday apartments in the Orlické hory mountains,
with online booking requests and an administration for the owners.

- `web/`: website and administration, Angular 22, Czech and English
- `api/`: management API, NestJS 12, PostgreSQL with TypeORM migrations
- `tools/`: image build scripts and a browser smoke test
- `.github/workflows/`: lint, test and build on every push, deploy from `main`

## Quick start

Needs Node 22+ and Docker (or your own PostgreSQL 14+).

```bash
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL on :5432
cd api && npm install && npm run start:dev       # API on :8080
cd web && npm install && npm start               # website on :4200
```

On the first start the API migrates the database, adds the apartments and prints the
password of `admin@rychtacenkovice.cz` once. The administration is at
http://localhost:4200/admin, the API documentation at http://localhost:8080/api/docs.

## Documentation

- [Development](docs/development.md): running locally, photos, CLI commands, tests
- [Architecture](docs/architecture.md): code layout, content JSON, languages, migrations
- [Bookings](docs/bookings.md): booking rules, apartments and prices
- [Portal calendars](docs/portal-calendars.md): blocking days from the e-chalupy.cz iCal feed
- [API](docs/api.md): endpoints and OpenAPI docs
- [Security](docs/security.md): sign-in, roles, cookies and hCaptcha
- [Deployment](docs/deployment.md): CI/CD, Docker, configuration variables
- [Search engines](docs/seo.md): server rendering, metadata, sitemap and structured data
- [Before going live](docs/go-live.md): what is still open
- [Showcase](docs/showcase.md): static demo on GitHub Pages

## Fonts

Sofia Sans and Sofia Sans Extra Condensed, SIL Open Font License 1.1, self-hosted in
`web/public/fonts`.
