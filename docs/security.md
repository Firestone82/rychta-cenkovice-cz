# Security, accounts and cookies

## Sign-in

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

## Accounts and roles

Accounts have one of three roles. An administrator manages everything, including the other
accounts on the Users page of the administration. Staff work with the overview, the calendar,
bookings and messages; the API refuses them changes to apartments, photos and accounts.
A read-only account sees the calendar and the bookings and cannot change anything.

## Cookies and hCaptcha

- On a first visit the website shows a cookie bar with "Allow all", "Necessary only" and
  "Settings". Nothing optional is stored or loaded before a choice. The choice can be
  changed at any time with "Cookie settings" in the footer or on the privacy page.
- Necessary: the choice itself (`rc-consent` in local storage), the administrator's
  refresh cookie and the language and theme of the administration. Preferences: the
  remembered language (`rc-lang`) and theme (`rc_theme`) of the website. Form protection:
  hCaptcha.
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
