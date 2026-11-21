# Before going live

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
- Set the deploy variables and secrets from [Deployment](deployment.md) once a server is
  ready. CI and the image publishing already run; the server step is off until then.
- Search engines (details in [Search engines](seo.md)): set `RC_PUBLIC_URL` to
  `https://www.rychtacenkovice.cz`, let the reverse proxy redirect `http://` and the address
  without `www.` there with 301, then add the site to Google Search Console and Seznam
  Webmaster and submit `/sitemap.xml` in both. Claim the place in Google Business Profile and
  on Mapy.cz (Firmy.cz) with the same name, address and phone as the website.
