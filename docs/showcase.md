# Showcase on GitHub Pages

A static copy of the website and the administration, for showing the project without a
server. `.github/workflows/pages.yml` builds it on every push to `main` and publishes it at
`https://<owner>.github.io/<repository>/`.

## How it works

- `ng build --configuration demo` swaps `config/demo.config.ts` for `demo.config.on.ts`.
  With `DEMO` on, `demoInterceptor` answers every API call in the browser (`src/app/demo/`)
  instead of the auth interceptor sending it.
- The fake API starts from `web/demo/data.json` and the photos in `web/demo/media/`, keeps
  changes in memory (a reload starts over) and moves the example bookings so they stay
  around today. Any password signs in; the session lasts for the browser tab.
- A band under the navigation (`rc-demo-notice`) says it is a demo, on the website and in
  the administration. Search engines are told not to index it.
- Photo uploads, e-mails and portal calendars do nothing.

Paths to `img/`, `video/` and `fonts/` are relative, so the site works under the
`/<repository>/` prefix of Pages as well as at the root.

`web/demo/` is not in git (about 23 MB of photos). The workflow downloads it as
`demo-data.zip` from the release tagged `demo-data`.

## Turning it on

1. Repository settings → Pages → Source: **GitHub Actions**.
2. Releases → Draft a new release, tag `demo-data`, attach `demo-data.zip`, publish.

The next push to `main` (or a manual run of the Showcase workflow) publishes it.

## Refreshing the data

Run the API with the photos imported and `npm run cli -- seed-demo` done (see
[Development](development.md)), then:

```bash
RC_ADMIN_EMAIL=... RC_ADMIN_PASSWORD=... \
  node tools/make-demo-snapshot.mjs --media api/data/media
```

It rewrites `web/demo/` with the apartments, photos (up to 960 px wide), bookings, messages,
accounts and portal calendars of that API. Then zip it and replace the release asset:

```bash
cd web && zip -qr demo-data.zip demo
```
